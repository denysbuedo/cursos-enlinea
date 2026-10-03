import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/lib/course-access";

async function getEditableCourse(courseIdOrSlug: string, userId: string, role: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true, instructorId: true },
  });
  if (!course) return null;
  if (!(await canManageCourse(course.id, userId, role))) return null;
  return course;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, sessionId } = await params;
    const permanent = new URL(request.url).searchParams.get("permanent") === "1";
    const course = await getEditableCourse(id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const existing = await prisma.session.findFirst({
      where: { id: sessionId, courseId: course.id },
      select: { id: true, title: true, status: true, _count: { select: { completions: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

    if (permanent) {
      if (existing.status !== "DRAFT" && existing.status !== "ARCHIVED") {
        return NextResponse.json({ error: "Solo se pueden eliminar sesiones en borrador o archivadas" }, { status: 409 });
      }
      if (existing._count.completions > 0) {
        return NextResponse.json({ error: "No se puede eliminar una sesión con progreso registrado" }, { status: 409 });
      }

      await prisma.session.delete({ where: { id: sessionId } });
      await prisma.auditLog.create({
        data: {
          action: "SESSION_DELETED",
          entity: "Session",
          entityId: sessionId,
          userId: session.userId,
          metadata: { courseId: course.id, previousStatus: existing.status, title: existing.title },
        },
      });
      return NextResponse.json({ data: { id: sessionId, deleted: true } });
    }

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
