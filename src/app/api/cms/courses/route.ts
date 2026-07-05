import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.role !== "ADMIN" && session.role !== "INSTRUCTOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (session.role === "INSTRUCTOR") where.instructorId = session.userId;
    if (status && ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"].includes(status)) {
      where.status = status;
    }

    if (search) {
      const searchPattern = `%${search}%`;
      const matching: { id: string }[] = await prisma.$queryRawUnsafe(
        `SELECT id FROM "Course" WHERE ("title"->>'es' ILIKE $1 OR "title"->>'en' ILIKE $1 OR "slug" ILIKE $1)`,
        searchPattern
      );
      where.id = { in: matching.map((course) => course.id) };
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: { select: { id: true, name: true, email: true } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            sessions: {
              where: { status: { not: "ARCHIVED" } },
              orderBy: { order: "asc" },
            },
          },
        },
        sessions: {
          where: { moduleId: null, status: { not: "ARCHIVED" } },
          orderBy: { order: "asc" },
        },
        evaluations: {
          take: 1,
        },
        editions: {
          orderBy: [{ isDefault: "desc" }, { startsAt: "asc" }, { createdAt: "asc" }],
          include: { _count: { select: { enrollments: true } } },
        },
        _count: { select: { enrollments: true, sessions: true, modules: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ data: courses });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
