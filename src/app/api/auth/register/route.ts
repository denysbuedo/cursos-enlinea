import { NextRequest, NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { AuthTokenType } from "@prisma/client";
import { appUrl, sendEmail } from "@/lib/email";
import { isValidEmail, issueAuthToken, normalizeEmail, validatePassword } from "@/lib/account-security";

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`auth:register:${ip}`, RATE_LIMITS.AUTH);
  if (!success) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const body = await request.json();
  const email = normalizeEmail(String(body.email || ""));
  const password = String(body.password || "");
  const name = String(body.name || "").trim();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }
  if (!isValidEmail(email)) return NextResponse.json({ error: "Escribe un correo electrónico válido." }, { status: 400 });

  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const token = await issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, 24 * 60 * 60 * 1000);
  const verificationUrl = `${appUrl()}/es/verify-email?token=${encodeURIComponent(token)}`;
  const sent = await sendEmail({
    to: user.email,
    subject: "Confirma tu cuenta en Aprendizaje Digital",
    text: `Confirma tu cuenta abriendo este enlace: ${verificationUrl}\nEl enlace caduca en 24 horas.`,
    html: `<p>Confirma tu cuenta en Aprendizaje Digital.</p><p><a href="${verificationUrl}">Confirmar correo electrónico</a></p><p>El enlace caduca en 24 horas.</p>`,
  });

  if (!sent) {
    await prisma.user.delete({ where: { id: user.id } });
    return NextResponse.json({ error: "No se pudo enviar el correo de confirmación. Inténtalo más tarde." }, { status: 503 });
  }

  return NextResponse.json({
    message: "Cuenta creada. Revisa tu correo para confirmar la cuenta.",
  });
}
