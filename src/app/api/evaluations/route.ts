import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateEnrollmentProgress } from "@/lib/progress";

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function safeQuestions(evaluation: { questions: unknown; shuffleQuestions: boolean; shuffleOptions: boolean }) {
  let questions = Array.isArray(evaluation.questions) ? (evaluation.questions as Array<Record<string, unknown>>) : [];
  questions = questions.map((q) => {
    const safe = { ...q };
    delete safe.correctAnswer;
    delete safe.feedback;
    if (safe.type === "MCQ" && Array.isArray(safe.options) && evaluation.shuffleOptions) safe.options = shuffle(safe.options);
    return safe;
  });
  return evaluation.shuffleQuestions ? shuffle(questions) : questions;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();
    const { searchParams } = new URL(request.url);
    const courseSlug = searchParams.get("courseSlug");
    const evaluationId = searchParams.get("evaluationId");
    if (!courseSlug && !evaluationId) return NextResponse.json({ error: "Falta courseSlug o evaluationId" }, { status: 400 });
    const directEvaluation = evaluationId ? await prisma.evaluation.findUnique({ where: { id: evaluationId }, include: { course: true, session: { select: { status: true } } } }) : null;
    const course = directEvaluation?.course || (courseSlug ? await prisma.course.findUnique({ where: { slug: courseSlug } }) : null);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    const enrollment = await prisma.enrollment.findFirst({ where: { userId, courseId: course.id, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
    if (!enrollment) return NextResponse.json({ error: "No estás matriculado en este curso" }, { status: 403 });
    const { progress } = await calculateEnrollmentProgress(enrollment.id, course.id);
    if (progress !== enrollment.progress) await prisma.enrollment.update({ where: { id: enrollment.id }, data: { progress } });
    const evaluation = directEvaluation || await prisma.evaluation.findFirst({ where: { courseId: course.id, evaluationType: "FINAL" }, include: { session: { select: { status: true } } }, orderBy: { createdAt: "asc" } });
    if (!evaluation) return NextResponse.json({ error: "Este curso no tiene evaluación configurada" }, { status: 404 });
    if (evaluation.evaluationType !== "FINAL" && evaluation.session?.status !== "PUBLISHED") return NextResponse.json({ error: "Evaluación no disponible" }, { status: 404 });
    if (evaluation.evaluationType === "FINAL" && progress < 100) return NextResponse.json({ error: "Debes completar todas las sesiones antes de la evaluación", progress }, { status: 400 });
    const previousAttempt = await prisma.evaluationAttempt.findFirst({ where: { evaluationId: evaluation.id, enrollmentId: enrollment.id, passed: true } });
    if (previousAttempt) return NextResponse.json({ data: { ...evaluation, questions: safeQuestions(evaluation) }, alreadyPassed: true, bestScore: previousAttempt.score, message: "Ya has aprobado esta evaluación" });
    const attemptCount = await prisma.evaluationAttempt.count({ where: { evaluationId: evaluation.id, enrollmentId: enrollment.id } });
    if (attemptCount >= evaluation.maxAttempts) return NextResponse.json({ error: "Has agotado los intentos disponibles para esta evaluación", attemptCount, maxAttempts: evaluation.maxAttempts }, { status: 409 });
    return NextResponse.json({ data: { ...evaluation, questions: safeQuestions(evaluation) }, alreadyPassed: false, attemptCount, remainingAttempts: evaluation.maxAttempts - attemptCount });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
