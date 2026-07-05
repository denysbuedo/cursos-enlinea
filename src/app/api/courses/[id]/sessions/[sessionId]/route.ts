import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getEditableCourse(courseIdOrSlug: string, userId: string, role: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true, instructorId: true },
  });
  if (!course) return null;
  if (role !== "ADMIN" && course.instructorId !== userId) return null;
  return course;
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, sessionId } = await params;
    const course = await getEditableCourse(id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const existing = await prisma.session.findFirst({
      where: { id: sessionId, courseId: course.id },
      select: { id: true, title: true, status: true },
    });
    if (!existing) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    const updated = await prisma.session.update({
      where: { id: sessionId },
      data: { status: "ARCHIVED" },
    });

    await prisma.auditLog.create({
      data: {
        action: "SESSION_ARCHIVED",
        entity: "Session",
        entityId: sessionId,
        userId: session.userId,
        metadata: { courseId: course.id, previousStatus: existing.status, title: existing.title },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
