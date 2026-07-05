import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateEnrollmentProgress } from "@/lib/progress";

// GET /api/evaluations?courseSlug=xxx
// Devuelve la evaluación sin las respuestas correctas
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const { searchParams } = new URL(request.url);
    const courseSlug = searchParams.get("courseSlug");

    if (!courseSlug) {
      return NextResponse.json(
        { error: "Falta courseSlug" },
        { status: 400 }
      );
    }

    // Buscar curso y verificar matrícula
    const course = await prisma.course.findUnique({
      where: { slug: courseSlug },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso no encontrado" },
        { status: 404 }
      );
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: course.id,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "No estás matriculado en este curso" },
        { status: 403 }
      );
    }

    const { progress } = await calculateEnrollmentProgress(enrollment.id, course.id);
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
          error: "Debes completar todas las sesiones antes de la evaluación",
          progress,
        },
        { status: 400 }
      );
    }

    const evaluation = await prisma.evaluation.findUnique({
      where: { courseId: course.id },
    });

    if (!evaluation) {
      return NextResponse.json(
        { error: "Este curso no tiene evaluación configurada" },
        { status: 404 }
      );
    }

    // Verificar si ya aprobó
    const previousAttempt = await prisma.evaluationAttempt.findFirst({
      where: {
        evaluationId: evaluation.id,
        enrollmentId: enrollment.id,
        passed: true,
      },
    });

    if (previousAttempt) {
      return NextResponse.json({
        data: evaluation,
        alreadyPassed: true,
        bestScore: previousAttempt.score,
        message: "Ya has aprobado esta evaluación",
      });
    }

    const attemptCount = await prisma.evaluationAttempt.count({
      where: {
        evaluationId: evaluation.id,
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

    // Eliminar respuestas correctas y feedback antes de enviar al cliente
    const safeQuestions = (evaluation.questions as Array<Record<string, unknown>>).map(
      (q) => {
        const safe = { ...q };
        delete safe.correctAnswer;
        delete safe.feedback;
        return safe;
      }
    );

    return NextResponse.json({
      data: {
        ...evaluation,
        questions: safeQuestions,
      },
      alreadyPassed: false,
      attemptCount,
      remainingAttempts: evaluation.maxAttempts - attemptCount,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
