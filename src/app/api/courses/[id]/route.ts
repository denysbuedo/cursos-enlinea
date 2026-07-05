import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`course:detail:${ip}`, RATE_LIMITS.VERIFY);
  if (!success) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes" },
      { status: 429 }
    );
  }

  const { id } = await params;

  // Buscar por slug o por UUID
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          sessions: {
            where: { status: "PUBLISHED" },
            orderBy: { order: "asc" },
          },
        },
      },
      editions: {
        where: { status: "PUBLISHED" },
        orderBy: [{ isDefault: "desc" }, { startsAt: "asc" }, { createdAt: "asc" }],
      },
      sessions: {
        where: { status: "PUBLISHED" },
        orderBy: [{ moduleId: "asc" }, { order: "asc" }],
      },
      _count: {
        select: { enrollments: true },
      },
      instructor: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  // Verificar si el usuario actual está matriculado o puede gestionar el curso
  let isEnrolled = false;
  let enrollmentStatus: string | null = null;
  const session = await getSession();
  if (session) {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.userId,
        courseId: course.id,
      },
      orderBy: { createdAt: "desc" },
    });
    if (enrollment) {
      enrollmentStatus = enrollment.status;
      isEnrolled = enrollment.status === "ACTIVE";
    }
  }

  const canManage =
    Boolean(session) &&
    (session?.role === "ADMIN" || (session?.role === "INSTRUCTOR" && course.instructorId === session.userId));
  const canViewPublicCourse = course.status === "PUBLISHED" && course.visibility === "PUBLIC";
  const canViewEnrolledCourse = course.status === "PUBLISHED" && course.visibility === "ENROLLED_ONLY" && isEnrolled;

  if (!canManage && !canViewPublicCourse && !canViewEnrolledCourse) {
    return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
  }

  // Si no está matriculado, solo devolver sesiones preview
  const sessions = isEnrolled
    ? course.sessions
    : course.sessions.filter((s) => s.preview);

  const modules = course.modules.map((module) => ({
    ...module,
    sessions: isEnrolled
      ? module.sessions
      : module.sessions.filter((s) => s.preview),
  })).filter((module) => module.sessions.length > 0 || isEnrolled);

  return NextResponse.json({
    ...course,
    sessions,
    modules,
    isEnrolled,
    enrollmentStatus,
    _count: course._count,
  });
}
