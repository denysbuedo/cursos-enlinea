import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/lib/course-access";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; reviewId: string }> }) {
  try {
    const session = await requireAuth();
    const { id, reviewId } = await params;
    const course = await prisma.course.findFirst({ where: { OR: [{ id }, { slug: id }] }, select: { id: true } });
    if (!course || !(await canManageCourse(course.id, session.userId, session.role))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    const body = await request.json();
    const status = body.status;
    if (!['PUBLISHED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json({ error: "Estado de moderación inválido" }, { status: 400 });
    }
    const review = await prisma.courseReview.update({ where: { id: reviewId, courseId: course.id }, data: { status }, select: { id: true, status: true } });
    return NextResponse.json({ data: review });
  } catch {
    return NextResponse.json({ error: "No se pudo moderar la valoración" }, { status: 500 });
  }
}
