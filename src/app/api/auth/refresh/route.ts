import { NextRequest, NextResponse } from "next/server";
import {
  createRefreshToken,
  revokeRefreshToken,
  signAccessToken,
  verifyRefreshToken,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ACCESS_TOKEN_MAX_AGE = 15 * 60;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("access_token", accessToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 0,
  });
}

function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set("access_token", "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("refresh_token", "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 0,
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("refresh_token")?.value;
  if (!token) {
    const response = NextResponse.json({ error: "No autorizado" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  try {
    const payload = await verifyRefreshToken(token);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: { select: { id: true, role: true, email: true, name: true } } },
    });

    if (!storedToken || storedToken.expiresAt <= new Date() || storedToken.userId !== payload.sub) {
      await revokeRefreshToken(token);
      const response = NextResponse.json({ error: "Sesión expirada" }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    await revokeRefreshToken(token);
    const accessToken = await signAccessToken(storedToken.user.id, storedToken.user.role);
    const refreshToken = await createRefreshToken(storedToken.user.id);

    const response = NextResponse.json({
      user: {
        id: storedToken.user.id,
        email: storedToken.user.email,
        name: storedToken.user.name,
        role: storedToken.user.role,
      },
    });
    setAuthCookies(response, accessToken, refreshToken);
    return response;
  } catch {
    await revokeRefreshToken(token);
    const response = NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }
}
