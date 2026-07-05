import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

async function getEditableCourse(courseIdOrSlug: string, userId: string, role: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true, instructorId: true },
  });
  if (!course) return null;
  if (role !== "ADMIN" && course.instructorId !== userId) return null;
  return course;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; editionId: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, editionId } = await params;
    const course = await getEditableCourse(id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const edition = await prisma.courseEdition.findFirst({
      where: { id: editionId, courseId: course.id },
      select: { id: true },
    });
    if (!edition) return NextResponse.json({ error: "Edición no encontrada" }, { status: 404 });

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: course.id, editionId },
      include: {
        user: { select: { id: true, name: true, email: true, country: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, amount: true, currency: true, method: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: enrollments });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; editionId: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, editionId } = await params;
    const course = await getEditableCourse(id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const status = body.status || "ACTIVE";
    const admissionType = body.admissionType || "MANUAL";

    if (!email || !["ACTIVE", "PENDING_PAYMENT", "SUSPENDED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const edition = await prisma.courseEdition.findFirst({
      where: { id: editionId, courseId: course.id },
      select: { id: true, capacity: true },
    });
    if (!edition) return NextResponse.json({ error: "Edición no encontrada" }, { status: 404 });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const existing = await prisma.enrollment.findFirst({
      where: { userId: user.id, courseId: course.id, editionId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "El usuario ya está matriculado en esta edición" }, { status: 409 });
    }

    if (edition.capacity) {
      const enrollmentCount = await prisma.enrollment.count({
        where: {
          editionId,
          status: { in: ["ACTIVE", "PENDING_PAYMENT"] },
        },
      });
      if (enrollmentCount >= edition.capacity) {
        return NextResponse.json({ error: "La edición seleccionada no tiene cupos disponibles" }, { status: 409 });
      }
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        courseId: course.id,
        editionId,
        status,
        admissionType,
      },
      include: {
        user: { select: { id: true, name: true, email: true, country: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, amount: true, currency: true, method: true, createdAt: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ENROLLMENT_CREATED_MANUALLY",
        entity: "Enrollment",
        entityId: enrollment.id,
        userId: session.userId,
        metadata: { courseId: course.id, editionId, studentUserId: user.id, status, admissionType },
      },
    });

    return NextResponse.json({ data: enrollment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; editionId: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id, editionId } = await params;
    const course = await getEditableCourse(id, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const { enrollmentId, status } = await request.json();
    if (!enrollmentId || !["ACTIVE", "PENDING_PAYMENT", "SUSPENDED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const existing = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, courseId: course.id, editionId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Matrícula no encontrada" }, { status: 404 });

    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true, country: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { id: true, status: true, amount: true, currency: true, method: true, createdAt: true },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ENROLLMENT_STATUS_UPDATED",
        entity: "Enrollment",
        entityId: enrollmentId,
        userId: session.userId,
        metadata: { courseId: course.id, editionId, status },
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
