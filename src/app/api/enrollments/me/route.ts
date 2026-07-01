import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId,
        status: "ACTIVE",
      },
      include: {
        course: {
          include: {
            sessions: {
              where: { preview: true },
              select: { id: true },
              take: 1,
              orderBy: { order: "asc" },
            },
            _count: {
              select: { sessions: true },
            },
          },
        },
        completions: {
          select: { sessionId: true },
        },
        certificate: {
          select: { id: true, badgeId: true, verificationUrl: true, isRevoked: true, issuedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: enrollments });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
