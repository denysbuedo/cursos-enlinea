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

// POST /api/admin/certificates — Revocar certificado desde el panel admin
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth("ADMIN");
    const body = await request.json().catch(() => ({}));
    const certificateId = typeof body.certificateId === "string" ? body.certificateId : "";
    const reason = typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : "Sin motivo especificado";

    if (!certificateId) {
      return NextResponse.json(
        { error: "Falta el identificador del certificado" },
        { status: 400 }
      );
    }

    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado no encontrado" },
        { status: 404 }
      );
    }

    if (certificate.isRevoked) {
      return NextResponse.json(
        { error: "El certificado ya está revocado" },
        { status: 400 }
      );
    }

    const updated = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        isRevoked: true,
        revocationReason: reason,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CERTIFICATE_REVOKED",
        entity: "Certificate",
        entityId: certificateId,
        userId,
        metadata: { badgeId: certificate.badgeId, reason, studentId: certificate.studentId },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN")
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
