import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

async function getEditableCourse(courseIdOrSlug: string, userId: string, role: string) {
  const course = await prisma.course.findFirst({
    where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
    select: { id: true, instructorId: true },
  });

  if (!course) return null;
  if (role !== "ADMIN" && course.instructorId !== userId) {
    throw new Error("FORBIDDEN");
  }
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

    const modules = await prisma.courseModule.findMany({
      where: { courseId: course.id },
      include: {
        sessions: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json({ data: modules });
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

    const { id: courseIdOrSlug } = await params;
    const course = await getEditableCourse(courseIdOrSlug, session.userId, session.role);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const body = await request.json();
    const { moduleId, title, description, order, status } = body;

    if (!title?.es && !title?.en) {
      return NextResponse.json({ error: "Falta title.es o title.en" }, { status: 400 });
    }

    let result;
    if (moduleId) {
      const existing = await prisma.courseModule.findFirst({
        where: { id: moduleId, courseId: course.id },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Módulo no encontrado para este curso" }, { status: 404 });
      }

      result = await prisma.courseModule.update({
        where: { id: moduleId },
        data: {
          title,
          description: description || {},
          order: order || 1,
          status: status || "PUBLISHED",
        },
      });
    } else {
      const maxOrder = await prisma.courseModule.findFirst({
        where: { courseId: course.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });

      result = await prisma.courseModule.create({
        data: {
          courseId: course.id,
          title,
          description: description || {},
          order: order || (maxOrder ? maxOrder.order + 1 : 1),
          status: status || "PUBLISHED",
        },
      });
    }

    return NextResponse.json({ data: result }, { status: moduleId ? 200 : 201 });
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
