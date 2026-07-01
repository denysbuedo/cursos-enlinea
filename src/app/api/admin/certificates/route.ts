import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/admin/certificates
export async function GET(request: NextRequest) {
  try {
    await requireAuth("ADMIN");

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 100);
    const revoked = searchParams.get("revoked"); // "true" | "false" | undefined (todos)

    const where: Record<string, unknown> = {};
    if (revoked === "true") where.isRevoked = true;
    else if (revoked === "false") where.isRevoked = false;

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          enrollment: {
            select: {
              user: { select: { id: true, name: true, email: true } },
              course: { select: { slug: true, title: true } },
            },
          },
        },
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.certificate.count({ where }),
    ]);

    return NextResponse.json({ data: certificates, total, page, pageSize });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
