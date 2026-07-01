import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/admin/payment-instructions — Listar todas
// POST /api/admin/payment-instructions — Crear/actualizar
export async function GET() {
  try {
    await requireAuth("ADMIN");

    const instructions = await prisma.paymentInstruction.findMany({
      orderBy: [{ currency: "asc" }, { method: "asc" }],
    });

    return NextResponse.json({ data: instructions });
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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth("ADMIN");
    const body = await request.json();

    const { id, method, currency, label, instructions, accountInfo, isActive, geoRestriction } = body;

    if (!method || !currency || !label || !instructions) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (method, currency, label, instructions)" },
        { status: 400 }
      );
    }

    let result;

    if (id) {
      // Actualizar existente
      result = await prisma.paymentInstruction.update({
        where: { id },
        data: {
          label,
          instructions,
          accountInfo: accountInfo || undefined,
          isActive: isActive !== undefined ? isActive : true,
          geoRestriction: geoRestriction || null,
        },
      });
    } else {
      // Crear nueva
      result = await prisma.paymentInstruction.create({
        data: {
          method,
          currency,
          label,
          instructions,
          accountInfo: accountInfo || undefined,
          isActive: isActive !== undefined ? isActive : true,
          geoRestriction: geoRestriction || null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: id ? "PAYMENT_INSTRUCTION_UPDATED" : "PAYMENT_INSTRUCTION_CREATED",
        entity: "PaymentInstruction",
        entityId: result.id,
        userId,
        metadata: { method: result.method, currency: result.currency },
      },
    });

    return NextResponse.json(
      { data: result },
      { status: id ? 200 : 201 }
    );
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
