import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/evaluations/[id]/submit
// Body: { answers: [{questionId, answer}] }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id: evaluationId } = await params;

    const { answers } = await request.json();

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Faltan las respuestas" },
        { status: 400 }
      );
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { course: true },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Evaluación no encontrada" },
        { status: 404 }
      );
    }

    // Verificar matrícula activa
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: evaluation.courseId,
        },
      },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "No tienes acceso a esta evaluación" },
        { status: 403 }
      );
    }

    // Verificar progreso 100%
    if (enrollment.progress < 100) {
      return NextResponse.json(
        {
          error:
            "Debes completar todas las sesiones antes de la evaluación",
        },
        { status: 403 }
      );
    }

    // Verificar que no haya aprobado ya
    const alreadyPassed = await prisma.evaluationAttempt.findFirst({
      where: {
        evaluationId,
        enrollmentId: enrollment.id,
        passed: true,
      },
    });

    if (alreadyPassed) {
      return NextResponse.json(
        {
          error: "Ya has aprobado esta evaluación",
          bestScore: alreadyPassed.score,
        },
        { status: 409 }
      );
    }

    // Corregir respuestas (server-side — nunca se envían las correctas al cliente)
    const questions = evaluation.questions as Array<Record<string, unknown>>;
    let totalPoints = 0;
    let earnedPoints = 0;

    const answerMap = new Map(
      answers.map((a: { questionId: string; answer: string }) => [
        a.questionId,
        a.answer,
      ])
    );

    for (const q of questions) {
      const points = (q.points as number) || 1;
      totalPoints += points;

      const userAnswer = answerMap.get(q.id as string);
      const correct = q.correctAnswer as string;

      if (!userAnswer) continue;

      // Normalizar comparación (case-insensitive, trim)
      const normalizedUser = String(userAnswer).trim().toLowerCase();
      const normalizedCorrect = String(correct).trim().toLowerCase();

      if (normalizedUser === normalizedCorrect) {
        earnedPoints += points;
      }
    }

    const score =
      totalPoints > 0
        ? Math.round((earnedPoints / totalPoints) * 100 * 10) / 10
        : 0;
    const passed = score >= evaluation.passingScore;

    const attempt = await prisma.evaluationAttempt.create({
      data: {
        evaluationId,
        enrollmentId: enrollment.id,
        answers,
        score,
        passed,
      },
    });

    return NextResponse.json({
      data: {
        id: attempt.id,
        score,
        passed,
        passingScore: evaluation.passingScore,
        totalPoints,
        earnedPoints,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
