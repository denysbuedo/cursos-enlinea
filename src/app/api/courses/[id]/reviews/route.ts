import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function findCourse(idOrSlug: string) {
  return prisma.course.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true },
  });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await findCourse(id);
  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const moderation = new URL(_request.url).searchParams.get("moderation") === "1";
  if (moderation) {
    try {
      const session = await requireAuth();
      const { canManageCourse } = await import("@/lib/course-access");
      if (!(await canManageCourse(course.id, session.userId, session.role))) {
        return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
      }
      const pending = await prisma.courseReview.findMany({
        where: { courseId: course.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, rating: true, testimonial: true, status: true, createdAt: true, user: { select: { name: true, email: true } } },
      });
      return NextResponse.json({ data: pending });
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const [reviews, aggregate] = await Promise.all([
    prisma.courseReview.findMany({
      where: { courseId: course.id, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, rating: true, testimonial: true, createdAt: true, user: { select: { name: true } } },
    }),
    prisma.courseReview.aggregate({
      where: { courseId: course.id, status: "PUBLISHED" },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    data: reviews,
    summary: { average: aggregate._avg.rating || 0, count: aggregate._count._all },
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const course = await findCourse(id);
    if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

    const enrollment = await prisma.enrollment.findFirst({
      where: { courseId: course.id, userId: session.userId, status: { notIn: ["CANCELLED", "SUSPENDED"] } },
      select: { id: true },
    });
    if (!enrollment) return NextResponse.json({ error: "Debes estar matriculado para valorar el curso" }, { status: 403 });

    const body = await request.json();
    const rating = Number(body.rating);
    const testimonial = typeof body.testimonial === "string" ? body.testimonial.trim().slice(0, 2000) : null;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "La valoración debe estar entre 1 y 5" }, { status: 400 });
    }

    const review = await prisma.courseReview.upsert({
      where: { courseId_userId: { courseId: course.id, userId: session.userId } },
      create: { courseId: course.id, userId: session.userId, rating, testimonial: testimonial || null },
      update: { rating, testimonial: testimonial || null, status: "PENDING" },
      select: { id: true, rating: true, testimonial: true, status: true },
    });
    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "No se pudo guardar la valoración" }, { status: 500 });
  }
}
