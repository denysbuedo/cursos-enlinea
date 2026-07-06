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
  tags?: string[];
  difficulty?: "BASIC" | "INTERMEDIATE" | "ADVANCED";
  topic?: string;
  moduleId?: string;
};

async function getEditableCourse(courseIdOrSlug: string, userId: string, role: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true, instructorId: true, questionBank: true, evaluations: { take: 1, select: { questions: true } } },
  });

  if (!course) return null;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("FORBIDDEN");
  }
  return course;
}

function validateQuestions(questions: QuestionInput[]) {
  if (!Array.isArray(questions)) return "El banco debe ser una lista de preguntas";

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

function normalizeQuestions(questions: QuestionInput[]) {
  return questions.map((question, index) => ({
    id: question.id || `bank-${Date.now()}-${index + 1}`,
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
      : [],
    correctAnswer: question.correctAnswer?.trim() || "",
    feedback: {
      es: question.feedback?.es || question.feedback?.en || "",
      en: question.feedback?.en || question.feedback?.es || "",
    },
    points: Number(question.points || 1),
    tags: Array.isArray(question.tags) ? question.tags.map(String).filter(Boolean) : [],
    difficulty: ["BASIC", "INTERMEDIATE", "ADVANCED"].includes(String(question.difficulty)) ? question.difficulty : "BASIC",
    topic: String(question.topic || "").trim(),
    moduleId: String(question.moduleId || "").trim(),
  }));
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

    const bank = Array.isArray(course.questionBank) ? course.questionBank : [];
    const fallback = bank.length > 0
      ? bank
      : Array.isArray(course.evaluations[0]?.questions)
        ? course.evaluations[0].questions
        : [];

    return NextResponse.json({ data: fallback, source: bank.length > 0 ? "BANK" : "EVALUATION" });
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
    const questions = body.questions as QuestionInput[];
    const questionError = validateQuestions(questions);
    if (questionError) {
      return NextResponse.json({ error: questionError }, { status: 400 });
    }

    const normalizedQuestions = normalizeQuestions(questions);
    const updated = await prisma.course.update({
      where: { id: course.id },
      data: { questionBank: normalizedQuestions as Prisma.InputJsonValue },
      select: { questionBank: true },
    });

    return NextResponse.json({ data: updated.questionBank });
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
