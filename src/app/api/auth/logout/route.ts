import { NextRequest, NextResponse } from "next/server";
import { revokeRefreshToken } from "@/lib/auth";

// POST /api/auth/logout
export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }

  const response = NextResponse.json({ success: true });
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
  return response;
}
