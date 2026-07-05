import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { calculateEnrollmentProgress } from "@/lib/progress";

// POST /api/sessions/[id]/mark-complete
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth();
    const { id: sessionId } = await params;

    // Buscar la sesión y su curso
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { course: { select: { id: true } } },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Sesión no encontrada" },
        { status: 404 }
      );
    }

    if (session.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "La sesión no está disponible" },
        { status: 403 }
      );
    }

    // Verificar que el usuario está matriculado en este curso
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: session.courseId,
        status: "ACTIVE",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "No tienes acceso a este curso" },
        { status: 403 }
      );
    }

    // Evitar duplicados
    const existing = await prisma.sessionCompletion.findUnique({
      where: {
        enrollmentId_sessionId: {
          enrollmentId: enrollment.id,
          sessionId,
        },
      },
    });

    if (existing) {
      // Recalcular progreso también para duplicados
      const { progress, completedSessions, totalSessions } = await calculateEnrollmentProgress(enrollment.id, session.courseId);

      return NextResponse.json({
        data: existing,
        progress,
        completedSessions,
        totalSessions,
        message: "Sesión ya estaba completada",
      });
    }

    // Crear completion y recalcular progreso
    const completion = await prisma.sessionCompletion.create({
      data: {
        enrollmentId: enrollment.id,
        sessionId,
      },
    });

    const { progress, completedSessions, totalSessions } = await calculateEnrollmentProgress(enrollment.id, session.courseId);

    const updated = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { progress },
    });

    return NextResponse.json({
      data: completion,
      progress: updated.progress,
      completedSessions,
      totalSessions,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
