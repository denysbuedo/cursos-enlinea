import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

type QuestionInput = {
  id?: string;
  type: "MCQ" | "TRUEFALSE" | "SHORT";
  question: { es?: string; en?: string };
  options?: Array<{ es?: string; en?: string }>;
  correctAnswer?: string;
  feedback?: { es?: string; en?: string };
  points?: number;
};

async function getEditableCourse(courseIdOrSlug: string, userId: string, role: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true, instructorId: true },
  });

  if (!course) return null;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("FORBIDDEN");
  }
  return course;
}

function validateQuestions(questions: QuestionInput[]) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return "La evaluación debe tener al menos una pregunta";
  }

  for (const [index, question] of questions.entries()) {
    if (!["MCQ", "TRUEFALSE", "SHORT"].includes(question.type)) {
      return `La pregunta ${index + 1} tiene un tipo inválido`;
    }
    if (!question.question?.es && !question.question?.en) {
      return `La pregunta ${index + 1} necesita texto`;
    }
    if (!question.correctAnswer?.trim()) {
      return `La pregunta ${index + 1} necesita respuesta correcta`;
    }
    if (question.type === "MCQ" && (!question.options || question.options.length < 2)) {
      return `La pregunta ${index + 1} necesita al menos dos opciones`;
    }
  }

  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const course = await getEditableCourse(id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const evaluation = await prisma.evaluation.findUnique({
      where: { courseId: course.id },
    });

    return NextResponse.json({ data: evaluation });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const course = await getEditableCourse(id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const body = await request.json();
    const { title, description, passingScore, maxAttempts, showFeedback, questions } = body;

    if (!title?.es && !title?.en) {
      return NextResponse.json({ error: "Falta título de evaluación" }, { status: 400 });
    }

    const questionError = validateQuestions(questions);
    if (questionError) {
      return NextResponse.json({ error: questionError }, { status: 400 });
    }

    const normalizedQuestions = (questions as QuestionInput[]).map((question, index) => ({
      id: question.id || `q${index + 1}`,
      type: question.type,
      question: {
        es: question.question?.es || question.question?.en || "",
        en: question.question?.en || question.question?.es || "",
      },
      options: question.type === "MCQ"
        ? (question.options || []).map((option) => ({
            es: option.es || option.en || "",
            en: option.en || option.es || "",
          }))
        : undefined,
      correctAnswer: question.correctAnswer?.trim(),
      feedback: {
        es: question.feedback?.es || question.feedback?.en || "",
        en: question.feedback?.en || question.feedback?.es || "",
      },
      points: Number(question.points || 1),
    }));

    const evaluation = await prisma.evaluation.upsert({
      where: { courseId: course.id },
      update: {
        title,
        description: description || {},
        passingScore: Number(passingScore || 80),
        maxAttempts: Math.max(1, Number(maxAttempts || 3)),
        showFeedback: showFeedback !== false,
        questions: normalizedQuestions as Prisma.InputJsonValue,
      },
      create: {
        courseId: course.id,
        title,
        description: description || {},
        passingScore: Number(passingScore || 80),
        maxAttempts: Math.max(1, Number(maxAttempts || 3)),
        showFeedback: showFeedback !== false,
        questions: normalizedQuestions as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ data: evaluation });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
