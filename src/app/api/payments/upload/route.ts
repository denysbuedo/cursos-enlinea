import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { uploadFile } from "@/lib/storage";

// POST /api/payments/upload
// Body: { enrollmentId, method, amount, currency, cryptoTxHash?, bankReference?, enzonaTxId?, notes? }
// FormData: file (comprobante)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth();

    // Rate limiting
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const { success } = await rateLimit(
      `payment:upload:${ip}`,
      RATE_LIMITS.PAYMENT_UPLOAD
    );
    if (!success) {
      return NextResponse.json(
        { error: "Demasiados intentos" },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const enrollmentId = formData.get("enrollmentId") as string;
    const method = formData.get("method") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const currency = formData.get("currency") as string;
    const cryptoTxHash = formData.get("cryptoTxHash") as string | null;
    const bankReference = formData.get("bankReference") as string | null;
    const enzonaTxId = formData.get("enzonaTxId") as string | null;
    const notes = formData.get("notes") as string | null;
    const file = formData.get("file") as File | null;

    // Validaciones
    if (!enrollmentId || !method || isNaN(amount) || !currency) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el enrollment pertenece al usuario
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { course: true },
    });

    if (!enrollment || enrollment.userId !== userId) {
      return NextResponse.json(
        { error: "Matrícula no encontrada" },
        { status: 404 }
      );
    }

    if (enrollment.status !== "ACTIVE" && enrollment.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "La matrícula no permite pagos en este estado" },
        { status: 400 }
      );
    }

    // Prevenir doble pago: verificar que no exista un pago PENDING o VERIFIED
    const existingPayment = await prisma.payment.findFirst({
      where: {
        enrollmentId,
        status: { in: ["PENDING", "VERIFIED"] },
      },
    });

    if (existingPayment) {
      return NextResponse.json(
        {
          error:
            "Ya existe un pago pendiente o verificado para esta matrícula",
        },
        { status: 409 }
      );
    }

    // Subir comprobante si hay archivo
    let proofUrl: string | undefined;
    if (file) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = `payments/${enrollmentId}/${Date.now()}-${file.name}`;
        proofUrl = await uploadFile("proofs", filePath, buffer, file.type);
      } catch (uploadError) {
        console.error("File upload failed, continuing without proof:", uploadError);
        // Continuar sin URL del comprobante — el pago se registra igual
      }
    }

    // Crear registro de pago
    const userCountry =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      undefined;

    const payment = await prisma.payment.create({
      data: {
        enrollmentId,
        currency: currency as "CUP" | "USD" | "EUR",
        method: method as
          | "ENZONA"
          | "TRANSFERMOVIL"
          | "BANK_TRANSFER_CUP"
          | "BANK_TRANSFER_INTL"
          | "CRYPTO_USDT"
          | "CRYPTO_USDC"
          | "MANUAL",
        amount,
        proofUrl,
        cryptoTxHash: cryptoTxHash || undefined,
        bankReference: bankReference || undefined,
        enzonaTxId: enzonaTxId || undefined,
        notes: notes || undefined,
        userIp: ip,
        userCountry,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });

    // Registrar en audit log
    await prisma.auditLog.create({
      data: {
        action: "PAYMENT_SUBMITTED",
        entity: "Payment",
        entityId: payment.id,
        userId,
        ipAddress: ip,
        metadata: { method, currency, amount },
      },
    });

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "UNAUTHORIZED") {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401 }
        );
      }
    }
    console.error("Payment upload error:", error);
    return NextResponse.json(
      { error: "Error al procesar el pago" },
      { status: 500 }
    );
  }
}
