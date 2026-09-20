import { NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword, clearAuthCookies, getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeUserSessions, validatePassword } from "@/lib/account-security";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { currentPassword, password } = await request.json();
  const passwordError = validatePassword(String(password || ""));
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !(await verifyPassword(String(currentPassword || ""), user.passwordHash))) {
    return NextResponse.json({ error: "La contraseña actual no es correcta" }, { status: 400 });
  }
  if (currentPassword === password) return NextResponse.json({ error: "La nueva contraseña debe ser diferente" }, { status: 400 });

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await revokeUserSessions(user.id);
  await clearAuthCookies();
  return NextResponse.json({ message: "Contraseña actualizada. Inicia sesión nuevamente." });
}
