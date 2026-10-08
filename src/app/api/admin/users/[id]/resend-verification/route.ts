import { NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/email";
import { hashToken, issueAuthToken } from "@/lib/account-security";
import { APP_NAME } from "@/lib/app-config";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAuth("ADMIN");
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, emailVerifiedAt: true },
    });
    if (!user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    if (user.emailVerifiedAt) return NextResponse.json({ error: "El correo ya está confirmado" }, { status: 409 });

    const rawToken = await issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, 24 * 60 * 60 * 1000);
    const verificationUrl = `${appUrl()}/es/verify-email?token=${encodeURIComponent(rawToken)}`;
    const sent = await sendEmail({
      to: user.email,
      subject: `Confirma tu cuenta en ${APP_NAME}`,
      text: `Confirma tu cuenta abriendo este enlace: ${verificationUrl}\nEl enlace caduca en 24 horas.`,
      html: `<p>Confirma tu cuenta en ${APP_NAME}.</p><p><a href="${verificationUrl}">Confirmar correo electrónico</a></p><p>El enlace caduca en 24 horas.</p>`,
    });

    if (!sent) {
      await prisma.authToken.deleteMany({ where: { userId: user.id, type: AuthTokenType.EMAIL_VERIFICATION, tokenHash: hashToken(rawToken) } });
      return NextResponse.json({ error: "No se pudo enviar el correo de confirmación" }, { status: 503 });
    }

    await prisma.auditLog.create({
      data: {
        action: "ADMIN_EMAIL_VERIFICATION_RESENT",
        entity: "User",
        entityId: user.id,
        userId: admin.userId,
        metadata: { email: user.email },
      },
    });
    return NextResponse.json({ message: "Correo de confirmación reenviado" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    return NextResponse.json({ error: "No se pudo reenviar el correo de confirmación" }, { status: 500 });
  }
}
