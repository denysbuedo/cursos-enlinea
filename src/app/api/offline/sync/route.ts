import { NextRequest, NextResponse } from "next/server";
import { verifyOfflineSyncToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEnrollmentProgress } from "@/lib/progress";
import { getCourseContentVersion } from "@/lib/course-version";

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

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!token) return json({ error: "Falta el token de sincronización" }, 401);

    const claims = await verifyOfflineSyncToken(token);
    if (claims.type !== "offline-sync" || !claims.sub || !claims.courseId || !claims.enrollmentId) {
      return json({ error: "Token de sincronización inválido" }, 401);
    }

    const body = await request.json().catch(() => ({}));
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

    const course = await prisma.course.findUnique({
      where: { id: claims.courseId },
      include: {
        modules: { select: { updatedAt: true } },
      },
    });
    if (!course) return json({ error: "Curso no encontrado" }, 404);
    const contentVersion = getCourseContentVersion(course);

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

    const allCompletions = await prisma.sessionCompletion.findMany({
      where: { enrollmentId: enrollment.id },
      select: { sessionId: true },
    });

    return json({
      data: {
        completedSessionIds: allCompletions.map((completion) => completion.sessionId),
        progress: progressState.progress,
        completedSessions: progressState.completedSessions,
        totalSessions: progressState.totalSessions,
        contentVersion,
        contentChanged: typeof body.contentVersion === "string" && body.contentVersion !== contentVersion,
        evaluation: body.evaluation ? { stored: false, reason: "Las evaluaciones oficiales se realizan en la plataforma." } : null,
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
