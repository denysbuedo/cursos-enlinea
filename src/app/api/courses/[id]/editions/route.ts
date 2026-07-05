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

    const editions = await prisma.courseEdition.findMany({
      where: { courseId: course.id },
      orderBy: [{ isDefault: "desc" }, { startsAt: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { enrollments: true } } },
    });

    return NextResponse.json({ data: editions });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
    const { editionId, name, startsAt, endsAt, capacity, status, isDefault } = body;

    if (!name?.es && !name?.en) {
      return NextResponse.json({ error: "Falta el nombre de la edición" }, { status: 400 });
    }

    if (isDefault) {
      await prisma.courseEdition.updateMany({
        where: { courseId: course.id },
        data: { isDefault: false },
      });
    }

    const data = {
      name,
      startsAt: startsAt ? new Date(startsAt) : null,
      endsAt: endsAt ? new Date(endsAt) : null,
      capacity: capacity ? Number(capacity) : null,
      status: status || "PUBLISHED",
      isDefault: Boolean(isDefault),
    };

    const result = editionId
      ? await prisma.courseEdition.update({
          where: { id: editionId },
          data,
        })
      : await prisma.courseEdition.create({
          data: {
            courseId: course.id,
            ...data,
          },
        });

    return NextResponse.json({ data: result }, { status: editionId ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
