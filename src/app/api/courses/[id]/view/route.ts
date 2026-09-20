import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await prisma.course.findFirst({
    where: { OR: [{ id }, { slug: id }], status: "PUBLISHED", visibility: "PUBLIC" },
    select: { id: true },
  });
  if (!course) return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });

  const visitorCookie = request.cookies.get("mooc_visitor_id")?.value;
  const visitorId = visitorCookie || randomUUID();
  let isNewVisitor = false;

  try {
    const existing = await prisma.courseVisit.findUnique({
      where: { courseId_visitorId: { courseId: course.id, visitorId } },
      select: { id: true },
    });

    if (existing) {
      await prisma.$transaction([
        prisma.courseViewEvent.create({ data: { courseId: course.id, visitorId } }),
        prisma.courseVisit.update({ where: { id: existing.id }, data: { visitCount: { increment: 1 } } }),
        prisma.course.update({ where: { id: course.id }, data: { viewCount: { increment: 1 } } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.courseViewEvent.create({ data: { courseId: course.id, visitorId } }),
        prisma.courseVisit.create({ data: { courseId: course.id, visitorId } }),
        prisma.course.update({ where: { id: course.id }, data: { viewCount: { increment: 1 }, uniqueVisitorCount: { increment: 1 } } }),
      ]);
      isNewVisitor = true;
    }
  } catch {
    return NextResponse.json({ error: "No se pudo registrar la visita" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, isNewVisitor });
  if (!visitorCookie) {
    response.cookies.set("mooc_visitor_id", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return response;
}
