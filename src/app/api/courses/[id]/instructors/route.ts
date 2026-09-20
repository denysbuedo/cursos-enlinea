import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageCourse } from "@/lib/course-access";

async function canManageAssignments(courseId: string, userId: string, role: string) {
  if (role === "ADMIN") return true;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { instructorId: true } });
  return Boolean(course?.instructorId === userId);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!(await canManageCourse(id, session.userId, session.role))) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const instructors = await prisma.courseInstructor.findMany({
      where: { courseId: id },
      orderBy: [{ role: "asc" }, { assignedAt: "asc" }],
      select: {
        id: true,
        role: true,
        assignedAt: true,
        user: { select: { id: true, name: true, email: true, bio: true, institution: true, avatarUrl: true } },
      },
    });
    return NextResponse.json({ data: instructors });
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!(await canManageAssignments(id, session.userId, session.role))) {
      return NextResponse.json({ error: "Solo el responsable principal puede asignar instructores" }, { status: 403 });
    }

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const role = body.role === "EDITOR" ? "EDITOR" : "INSTRUCTOR";
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user || user.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "El usuario debe tener rol de instructor" }, { status: 400 });
    }
    const course = await prisma.course.findUnique({ where: { id }, select: { instructorId: true } });
    if (course?.instructorId === userId) {
      return NextResponse.json({ error: "El responsable principal ya está asignado como LEAD" }, { status: 400 });
    }

    const assignment = await prisma.courseInstructor.upsert({
      where: { courseId_userId: { courseId: id, userId } },
      create: { courseId: id, userId, role },
      update: { role },
      select: { id: true, role: true, user: { select: { id: true, name: true, email: true, bio: true, institution: true, avatarUrl: true } } },
    });
    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "No se pudo asignar el instructor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!(await canManageAssignments(id, session.userId, session.role))) {
      return NextResponse.json({ error: "Solo el responsable principal puede retirar instructores" }, { status: 403 });
    }
    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    const course = await prisma.course.findUnique({ where: { id }, select: { instructorId: true } });
    if (course?.instructorId === userId) {
      return NextResponse.json({ error: "No se puede retirar al responsable principal" }, { status: 400 });
    }
    await prisma.courseInstructor.delete({ where: { courseId_userId: { courseId: id, userId } } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se pudo retirar el instructor" }, { status: 500 });
  }
}
