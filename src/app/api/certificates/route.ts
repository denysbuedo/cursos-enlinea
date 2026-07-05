import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/certificates — Certificados del usuario autenticado
export async function GET() {
  try {
    const { userId } = await requireAuth();

    const certificates = await prisma.certificate.findMany({
      where: { studentId: userId },
      include: {
        enrollment: {
          select: {
            user: { select: { name: true } },
            course: { select: { title: true, slug: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });

    return NextResponse.json({ data: certificates });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
