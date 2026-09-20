import { NextRequest, NextResponse } from "next/server";
import { AuthTokenType } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { consumeAuthToken, revokeUserSessions, validatePassword } from "@/lib/account-security";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();
  const passwordError = validatePassword(String(password || ""));
  if (!token || passwordError) return NextResponse.json({ error: passwordError || "Token inválido" }, { status: 400 });

  const authToken = await consumeAuthToken(token, AuthTokenType.PASSWORD_RESET);
  if (!authToken) return NextResponse.json({ error: "El enlace es inválido o ha caducado" }, { status: 400 });

  await prisma.user.update({ where: { id: authToken.user.id }, data: { passwordHash: await hashPassword(password) } });
  await revokeUserSessions(authToken.user.id);
  return NextResponse.json({ message: "Contraseña actualizada. Ya puedes iniciar sesión." });
}
