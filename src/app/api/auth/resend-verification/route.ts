import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { appUrl, sendEmail } from "@/lib/email";
import { isValidEmail, issueAuthToken, normalizeEmail } from "@/lib/account-security";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`auth:resend:${ip}`, RATE_LIMITS.AUTH);
  if (!success) return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });

  const body = await request.json();
  const email = normalizeEmail(String(body.email || ""));
  const generic = { message: "Si la cuenta necesita confirmación, recibirás un nuevo correo." };
  if (!isValidEmail(email)) return NextResponse.json(generic);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerifiedAt) return NextResponse.json(generic);

  const token = await issueAuthToken(user.id, AuthTokenType.EMAIL_VERIFICATION, 24 * 60 * 60 * 1000);
  const verificationUrl = `${appUrl()}/es/verify-email?token=${encodeURIComponent(token)}`;
  await sendEmail({
    to: user.email,
    subject: "Confirma tu cuenta en Aprendizaje Digital",
    text: `Confirma tu cuenta abriendo este enlace: ${verificationUrl}\nEl enlace caduca en 24 horas.`,
    html: `<p><a href="${verificationUrl}">Confirmar correo electrónico</a></p><p>El enlace caduca en 24 horas.</p>`,
  });
  return NextResponse.json(generic);
}
