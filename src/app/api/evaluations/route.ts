import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

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

    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: course.id,
        },
      },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "No estás matriculado en este curso" },
        { status: 403 }
      );
    }

    // Verificar progreso 100%
    if (enrollment.progress < 100) {
      return NextResponse.json(
        {
          error: "Debes completar todas las sesiones antes de la evaluación",
          progress: enrollment.progress,
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

    // Eliminar respuestas correctas antes de enviar al cliente
    const safeQuestions = (evaluation.questions as Array<Record<string, unknown>>).map(
      (q) => {
        const { correctAnswer, ...safe } = q;
        return safe;
      }
    );

    return NextResponse.json({
      data: {
        ...evaluation,
        questions: safeQuestions,
      },
      alreadyPassed: false,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
