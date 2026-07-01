import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Buscar el curso (por slug o id)
  const course = await prisma.course.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true },
  });

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  // Verificar si el usuario está autenticado y matriculado
  const session = await getSession();
  let isEnrolled = false;
  if (session) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    });
    isEnrolled = !!enrollment && enrollment.status === "ACTIVE";
  }

  const sessions = await prisma.session.findMany({
    where: {
      courseId: course.id,
      status: "PUBLISHED",
    },
    orderBy: { order: "asc" },
  });

  // Si no está matriculado, filtrar solo previews
  const visibleSessions = isEnrolled
    ? sessions
    : sessions.filter((s) => s.preview);

  return NextResponse.json({
    data: visibleSessions,
    total: visibleSessions.length,
    isEnrolled,
  });
}

// POST — Crear/actualizar sesión (ADMIN o INSTRUCTOR del curso)
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
    const course = await prisma.course.findFirst({
      where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }] },
      select: { id: true, instructorId: true },
    });
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    if (session.role !== "ADMIN" && course.instructorId !== session.userId) {
      return NextResponse.json({ error: "No eres el instructor de este curso" }, { status: 403 });
    }

    const body = await request.json();
    const { sessionId, title, description, keywords, sessionType, preview, videoUrl, videoPlatform, order } = body;

    if (!title) return NextResponse.json({ error: "Falta title" }, { status: 400 });

    let result;
    if (sessionId) {
      result = await prisma.session.update({
        where: { id: sessionId },
        data: {
          title, description: description || {},
          keywords: keywords || [],
          sessionType: sessionType || "RECORDED",
          preview: preview !== undefined ? preview : false,
          videoUrl, videoPlatform,
          order: order || 1,
          status: "PUBLISHED",
        },
      });
    } else {
      const maxOrder = await prisma.session.findFirst({
        where: { courseId: course.id },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      result = await prisma.session.create({
        data: {
          courseId: course.id,
          title, description: description || {},
          keywords: keywords || [],
          sessionType: sessionType || "RECORDED",
          preview: preview !== undefined ? preview : false,
          videoUrl, videoPlatform,
          order: order || (maxOrder ? maxOrder.order + 1 : 1),
          status: "PUBLISHED",
        },
      });
    }

    return NextResponse.json({ data: result }, { status: sessionId ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
