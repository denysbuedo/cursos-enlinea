import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { appUrl, sendEmail } from "@/lib/email";
import { issueAuthToken, normalizeEmail } from "@/lib/account-security";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`auth:forgot:${ip}`, RATE_LIMITS.AUTH);
  if (!success) return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });

  const body = await request.json();
  const email = normalizeEmail(String(body.email || ""));
  const generic = { message: "Si existe una cuenta con ese correo, recibirás instrucciones para restablecer la contraseña." };
  if (!email) return NextResponse.json(generic);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.emailVerifiedAt) return NextResponse.json(generic);

  const token = await issueAuthToken(user.id, AuthTokenType.PASSWORD_RESET, 60 * 60 * 1000);
  const resetUrl = `${appUrl()}/es/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: "Restablece tu contraseña",
    text: `Restablece tu contraseña abriendo este enlace: ${resetUrl}\nEl enlace caduca en una hora.`,
    html: `<p>Solicitaste restablecer tu contraseña.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p><p>El enlace caduca en una hora.</p>`,
  });
  return NextResponse.json(generic);
}
