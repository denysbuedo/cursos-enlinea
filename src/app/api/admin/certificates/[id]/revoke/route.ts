import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/admin/certificates/[id]/revoke
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("ADMIN");
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Sin motivo especificado";

    const certificate = await prisma.certificate.findUnique({
      where: { id },
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
      where: { id },
      data: {
        isRevoked: true,
        revocationReason: reason,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CERTIFICATE_REVOKED",
        entity: "Certificate",
        entityId: id,
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
