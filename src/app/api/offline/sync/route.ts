import { NextRequest, NextResponse } from "next/server";
import { verifyOfflineSyncToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEnrollmentProgress } from "@/lib/progress";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function sameAnswer(userAnswer: unknown, correctAnswer: unknown, options: unknown) {
  const user = String(userAnswer ?? "").trim().toLowerCase();
  const correct = String(correctAnswer ?? "").trim().toLowerCase();
  if (user && user === correct) return true;
  if (!Array.isArray(options)) return false;
  return options.some((option) => {
    if (!option || typeof option !== "object") return false;
    const item = option as Record<string, unknown>;
    const values = [item.id, item.value, item.text, item.es, item.en]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
    return values.includes(user) && values.includes(correct);
  });
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return json({ error: "Falta el token de sincronización" }, 401);

    const claims = await verifyOfflineSyncToken(token);
    if (claims.type !== "offline-sync" || !claims.sub || !claims.courseId || !claims.enrollmentId) {
      return json({ error: "Token de sincronización inválido" }, 401);
    }

    const body = await request.json();
    const requestedSessionIds: string[] = Array.isArray(body.completedSessionIds)
      ? Array.from(new Set(body.completedSessionIds.filter((value: unknown): value is string => typeof value === "string")))
      : [];

    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: claims.enrollmentId,
        userId: claims.sub,
        courseId: claims.courseId,
        status: "ACTIVE",
      },
    });
    if (!enrollment) return json({ error: "La matrícula ya no está disponible" }, 403);

    const validSessions = await prisma.session.findMany({
      where: { id: { in: requestedSessionIds }, courseId: claims.courseId, status: "PUBLISHED" },
      select: { id: true },
    });
    const validSessionIds = validSessions.map((session) => session.id);

    if (validSessionIds.length) {
      await prisma.sessionCompletion.createMany({
        data: validSessionIds.map((sessionId) => ({ enrollmentId: enrollment.id, sessionId })),
        skipDuplicates: true,
      });
    }

    const progressState = await calculateEnrollmentProgress(enrollment.id, claims.courseId);
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progress: progressState.progress },
    });

    let evaluationResult: Record<string, unknown> | null = null;
    const submittedEvaluation = body.evaluation;
    if (submittedEvaluation && typeof submittedEvaluation === "object" && typeof submittedEvaluation.evaluationId === "string" && Array.isArray(submittedEvaluation.answers)) {
      const evaluation = await prisma.evaluation.findFirst({
        where: { id: submittedEvaluation.evaluationId, courseId: claims.courseId },
      });
      if (evaluation && progressState.progress >= 100) {
        const questions = Array.isArray(evaluation.questions) ? evaluation.questions as Array<Record<string, unknown>> : [];
        const answers: Array<{ questionId: string; answer: string }> = submittedEvaluation.answers
          .filter((answer: unknown): answer is { questionId: string; answer: string } => {
            return Boolean(answer && typeof answer === "object" && typeof (answer as Record<string, unknown>).questionId === "string");
          })
          .map((answer: { questionId: string; answer: string }) => ({ questionId: answer.questionId, answer: String(answer.answer ?? "") }));
        const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.answer]));
        let totalPoints = 0;
        let earnedPoints = 0;
        for (const [index, question] of questions.entries()) {
          const points = Number(question.points) || 1;
          totalPoints += points;
          const questionId = String(question.id || `q${index + 1}`);
          if (sameAnswer(answerMap.get(questionId), question.correctAnswer, question.options)) earnedPoints += points;
        }
        const score = totalPoints ? Math.round((earnedPoints / totalPoints) * 100 * 10) / 10 : 0;
        const passed = score >= evaluation.passingScore;
        const bestAttempt = await prisma.evaluationAttempt.findFirst({
          where: { evaluationId: evaluation.id, enrollmentId: enrollment.id },
          orderBy: [{ score: "desc" }, { submittedAt: "desc" }],
        });
        if (!bestAttempt || (!bestAttempt.passed && score > bestAttempt.score)) {
          const attempt = await prisma.evaluationAttempt.create({
            data: { evaluationId: evaluation.id, enrollmentId: enrollment.id, answers, score, passed },
          });
          evaluationResult = { score: attempt.score, passed: attempt.passed, stored: true };
        } else {
          evaluationResult = { score: bestAttempt.score, passed: bestAttempt.passed, stored: false };
        }
      } else if (evaluation) {
        evaluationResult = { stored: false, reason: "Completa todas las sesiones antes de sincronizar la evaluación" };
      }
    }

    return json({
      data: {
        completedSessionIds: validSessionIds,
        progress: progressState.progress,
        completedSessions: progressState.completedSessions,
        totalSessions: progressState.totalSessions,
        evaluation: evaluationResult,
      },
    });
  } catch (error) {
    const errorCode = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
    if (errorCode === "ERR_JWT_EXPIRED" || errorCode === "ERR_JWS_INVALID") {
      return json({ error: "El token de sincronización ha expirado" }, 401);
    }
    return json({ error: "No se pudo sincronizar el progreso" }, 500);
  }
}
