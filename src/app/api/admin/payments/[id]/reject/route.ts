import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/admin/payments/[id]/reject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("ADMIN");
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Sin motivo especificado";

    const payment = await prisma.payment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: `El pago ya está en estado ${payment.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedBy: userId,
        reviewedAt: new Date(),
        notes: payment.notes
          ? `${payment.notes}\nRechazado: ${reason}`
          : `Rechazado: ${reason}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_REJECTED",
        entity: "Payment",
        entityId: id,
        userId,
        metadata: { reason },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
