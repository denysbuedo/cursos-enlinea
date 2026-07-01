import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, signAccessToken, createRefreshToken, setAuthCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`auth:login:${ip}`, RATE_LIMITS.AUTH);
  if (!success) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  const { email, password } = await request.json();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const accessToken = await signAccessToken(user.id, user.role);
  const refreshToken = await createRefreshToken(user.id);
  await setAuthCookies(accessToken, refreshToken);

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferredLang: user.preferredLang,
      country: user.country,
    },
  });
}
