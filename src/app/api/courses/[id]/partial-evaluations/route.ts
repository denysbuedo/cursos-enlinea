import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { canManageCourse } from "@/lib/course-access";
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

async function editableCourse(courseIdOrSlug: string, userId: string, role: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true },
  });
  if (!course) return null;
  if (!(await canManageCourse(course.id, userId, role))) throw new Error("FORBIDDEN");
  return course;
}

function normalizeQuestions(questions: QuestionInput[]) {
  if (!Array.isArray(questions) || questions.length === 0) throw new Error("La evaluación debe tener al menos una pregunta");
  return questions.map((question, index) => {
    if (!["MCQ", "TRUEFALSE", "SHORT"].includes(question.type)) throw new Error(`La pregunta ${index + 1} tiene un tipo inválido`);
    if (!question.question?.es && !question.question?.en) throw new Error(`La pregunta ${index + 1} necesita texto`);
    if (!question.correctAnswer?.trim()) throw new Error(`La pregunta ${index + 1} necesita respuesta correcta`);
    if (question.type === "MCQ" && (!question.options || question.options.length < 2)) throw new Error(`La pregunta ${index + 1} necesita al menos dos opciones`);
    return {
      id: question.id || `q${index + 1}`,
      type: question.type,
      question: { es: question.question.es || question.question.en || "", en: question.question.en || question.question.es || "" },
      options: question.type === "MCQ" ? (question.options || []).map((option) => ({ es: option.es || option.en || "", en: option.en || option.es || "" })) : undefined,
      correctAnswer: question.correctAnswer.trim(),
      feedback: { es: question.feedback?.es || question.feedback?.en || "", en: question.feedback?.en || question.feedback?.es || "" },
      points: Number(question.points || 1),
      tags: Array.isArray(question.tags) ? question.tags.map(String).filter(Boolean) : [],
      difficulty: ["BASIC", "INTERMEDIATE", "ADVANCED"].includes(String(question.difficulty)) ? question.difficulty : "BASIC",
      topic: String(question.topic || "").trim(),
      moduleId: String(question.moduleId || "").trim(),
    };
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    const course = await editableCourse((await params).id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    const evaluations = await prisma.evaluation.findMany({
      where: { courseId: course.id, evaluationType: { in: ["PARTIAL", "AUTOEVALUATION"] } },
      include: { session: { select: { id: true, title: true, order: true } }, module: { select: { id: true, title: true, order: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ data: evaluations });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    const course = await editableCourse((await params).id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    const body = await request.json();
    const { sessionId, moduleId, title, description, passingScore, maxAttempts, showFeedback, shuffleQuestions, shuffleOptions } = body;
    const evaluationType = body.evaluationType === "AUTOEVALUATION" ? "AUTOEVALUATION" : "PARTIAL";
    if (!sessionId || (!title?.es && !title?.en)) return NextResponse.json({ error: "La evaluación parcial necesita sesión y título" }, { status: 400 });
    const targetSession = await prisma.session.findFirst({ where: { id: sessionId, courseId: course.id }, select: { id: true, moduleId: true } });
    if (!targetSession) return NextResponse.json({ error: "La sesión no pertenece al curso" }, { status: 400 });
    let normalizedQuestions;
    try { normalizedQuestions = normalizeQuestions(body.questions); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Preguntas inválidas" }, { status: 400 }); }
    const evaluation = await prisma.evaluation.create({
      data: {
        courseId: course.id,
        sessionId: targetSession.id,
        moduleId: moduleId || targetSession.moduleId || null,
        evaluationType,
        title,
        description: description || {},
        passingScore: Number(passingScore || 80),
        maxAttempts: Math.max(1, Number(maxAttempts || 3)),
        showFeedback: showFeedback !== false,
        shuffleQuestions: shuffleQuestions !== false,
        shuffleOptions: shuffleOptions !== false,
        questions: normalizedQuestions as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ data: evaluation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error del servidor" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    const course = await editableCourse((await params).id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const evaluationId = new URL(request.url).searchParams.get("evaluationId");
    if (!evaluationId) return NextResponse.json({ error: "Falta el identificador de la evaluación" }, { status: 400 });

    const existing = await prisma.evaluation.findFirst({
      where: {
        id: evaluationId,
        courseId: course.id,
        evaluationType: { in: ["PARTIAL", "AUTOEVALUATION"] },
      },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });

    const body = await request.json();
    const { sessionId, moduleId, title, description, passingScore, maxAttempts, showFeedback, shuffleQuestions, shuffleOptions } = body;
    const evaluationType = body.evaluationType === "AUTOEVALUATION" ? "AUTOEVALUATION" : "PARTIAL";
    if (!sessionId || (!title?.es && !title?.en)) return NextResponse.json({ error: "La evaluación necesita sesión y título" }, { status: 400 });

    const targetSession = await prisma.session.findFirst({ where: { id: sessionId, courseId: course.id }, select: { id: true, moduleId: true } });
    if (!targetSession) return NextResponse.json({ error: "La sesión no pertenece al curso" }, { status: 400 });

    let normalizedQuestions;
    try {
      normalizedQuestions = normalizeQuestions(body.questions);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Preguntas inválidas" }, { status: 400 });
    }

    const evaluation = await prisma.evaluation.update({
      where: { id: existing.id },
      data: {
        sessionId: targetSession.id,
        moduleId: moduleId || targetSession.moduleId || null,
        evaluationType,
        title,
        description: description || {},
        passingScore: Number(passingScore || 80),
        maxAttempts: Math.max(1, Number(maxAttempts || 3)),
        showFeedback: showFeedback !== false,
        shuffleQuestions: shuffleQuestions !== false,
        shuffleOptions: shuffleOptions !== false,
        questions: normalizedQuestions as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json({ data: evaluation });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    const course = await editableCourse((await params).id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const evaluationId = new URL(request.url).searchParams.get("evaluationId");
    if (!evaluationId) return NextResponse.json({ error: "Falta el identificador de la evaluación" }, { status: 400 });

    const evaluation = await prisma.evaluation.findFirst({
      where: {
        id: evaluationId,
        courseId: course.id,
        evaluationType: { in: ["PARTIAL", "AUTOEVALUATION"] },
      },
      select: { id: true },
    });
    if (!evaluation) return NextResponse.json({ error: "Evaluación no encontrada" }, { status: 404 });

    await prisma.evaluation.delete({ where: { id: evaluation.id } });
    return NextResponse.json({ data: { id: evaluation.id } });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: "No se pudo eliminar la evaluación" }, { status: 500 });
  }
}
