import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { consumeAuthToken } from "@/lib/account-security";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token || typeof token !== "string") return NextResponse.json({ error: "Token inválido" }, { status: 400 });

  const authToken = await consumeAuthToken(token, AuthTokenType.EMAIL_VERIFICATION);
  if (!authToken) return NextResponse.json({ error: "El enlace es inválido o ha caducado" }, { status: 400 });

  if (!authToken.user.emailVerifiedAt) {
    await prisma.user.update({ where: { id: authToken.user.id }, data: { emailVerifiedAt: new Date() } });
  }

  return NextResponse.json({ message: "Correo confirmado. Ya puedes iniciar sesión." });
}
