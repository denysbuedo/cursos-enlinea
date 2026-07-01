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
      sessions: {
        orderBy: { order: "asc" },
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

  // Verificar si el usuario actual está matriculado
  let isEnrolled = false;
  let enrollmentStatus: string | null = null;
  const session = await getSession();
  if (session) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.userId,
          courseId: course.id,
        },
      },
    });
    if (enrollment) {
      enrollmentStatus = enrollment.status;
      isEnrolled = enrollment.status === "ACTIVE";
    }
  }

  // Si no está matriculado, solo devolver sesiones preview
  const sessions = isEnrolled
    ? course.sessions
    : course.sessions.filter((s) => s.preview);

  return NextResponse.json({
    ...course,
    sessions,
    isEnrolled,
    enrollmentStatus,
    _count: course._count,
  });
}
