import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// POST /api/admin/payments/[id]/verify
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await requireAuth("ADMIN");
    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { enrollment: true },
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

    // Verificar pago y activar matrícula
    const [updatedPayment] = await prisma.$transaction([
      prisma.payment.update({
        where: { id },
        data: {
          status: "VERIFIED",
          reviewedBy: userId,
          reviewedAt: new Date(),
        },
      }),
      prisma.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: "ACTIVE" },
      }),
      prisma.auditLog.create({
        data: {
          action: "PAYMENT_VERIFIED",
          entity: "Payment",
          entityId: id,
          userId,
          metadata: {
            enrollmentId: payment.enrollmentId,
            amount: payment.amount.toString(),
            currency: payment.currency,
          },
        },
      }),
    ]);

    return NextResponse.json({ data: updatedPayment });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    console.error("Verify payment error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
