import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateEnrollmentProgress } from "@/lib/progress";

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
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: evaluation.courseId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "No tienes acceso a esta evaluación" },
        { status: 403 }
      );
    }

    const { progress } = await calculateEnrollmentProgress(enrollment.id, evaluation.courseId);
    if (progress !== enrollment.progress) {
      await prisma.enrollment.update({
        where: { id: enrollment.id },
        data: { progress },
      });
    }

    // Verificar progreso 100%
    if (progress < 100) {
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

    const attemptCount = await prisma.evaluationAttempt.count({
      where: {
        evaluationId,
        enrollmentId: enrollment.id,
      },
    });

    if (attemptCount >= evaluation.maxAttempts) {
      return NextResponse.json(
        {
          error: "Has agotado los intentos disponibles para esta evaluación",
          attemptCount,
          maxAttempts: evaluation.maxAttempts,
        },
        { status: 409 }
      );
    }

    // Corregir respuestas (server-side — nunca se envían las correctas al cliente)
    const questions = evaluation.questions as Array<Record<string, unknown>>;
    let totalPoints = 0;
    let earnedPoints = 0;
    const questionResults: Array<{
      questionId: string;
      correct: boolean;
      points: number;
      earnedPoints: number;
      feedback?: unknown;
      correctAnswer?: string;
    }> = [];

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

      if (!userAnswer) {
        questionResults.push({
          questionId: q.id as string,
          correct: false,
          points,
          earnedPoints: 0,
          feedback: evaluation.showFeedback ? q.feedback : undefined,
          correctAnswer: evaluation.showFeedback ? correct : undefined,
        });
        continue;
      }

      // Normalizar comparación (case-insensitive, trim)
      const normalizedUser = String(userAnswer).trim().toLowerCase();
      const normalizedCorrect = String(correct).trim().toLowerCase();

      const isMcq = q.type === "MCQ" && Array.isArray(q.options);
      const matchesLocalizedOption = isMcq && (q.options as Array<Record<string, string>>).some((option) => {
        const values = [option.es, option.en].filter(Boolean).map((value) =>
          String(value).trim().toLowerCase()
        );
        return values.includes(normalizedUser) && values.includes(normalizedCorrect);
      });

      const isCorrect = normalizedUser === normalizedCorrect || matchesLocalizedOption;
      if (isCorrect) {
        earnedPoints += points;
      }
      questionResults.push({
        questionId: q.id as string,
        correct: isCorrect,
        points,
        earnedPoints: isCorrect ? points : 0,
        feedback: evaluation.showFeedback ? q.feedback : undefined,
        correctAnswer: evaluation.showFeedback ? correct : undefined,
      });
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
        attemptCount: attemptCount + 1,
        remainingAttempts: Math.max(0, evaluation.maxAttempts - attemptCount - 1),
        maxAttempts: evaluation.maxAttempts,
        feedback: evaluation.showFeedback ? questionResults : [],
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
