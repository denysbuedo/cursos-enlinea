import { NextRequest, NextResponse } from "next/server";
import { hashPassword, signAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`auth:register:${ip}`, RATE_LIMITS.AUTH);
  if (!success) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const { email, password, name } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash, name },
  });

  const accessToken = await signAccessToken(user.id, user.role);
  const refreshToken = await createRefreshToken(user.id);
  await setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
