import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, signAccessToken, createRefreshToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

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
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { success } = await rateLimit(`auth:login:${ip}`, RATE_LIMITS.AUTH);
  const contentType = request.headers.get("content-type") || "";
  const isFormSubmit = contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");

  if (!success) {
    return NextResponse.json({ error: "Demasiados intentos" }, { status: 429 });
  }

  let email = "";
  let password = "";
  let redirectTo = "/es/dashboard";

  if (isFormSubmit) {
    const formData = await request.formData();
    email = String(formData.get("email") || "");
    password = String(formData.get("password") || "");
    redirectTo = String(formData.get("redirectTo") || redirectTo);
  } else {
    const body = await request.json();
    email = body.email;
    password = body.password;
  }

  const fail = (message: string, status = 401) => {
    if (isFormSubmit) {
      const url = new URL("/es/login", request.url);
      url.searchParams.set("error", message);
      return NextResponse.redirect(url, { status: 303 });
    }
    return NextResponse.json({ error: message }, { status });
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return fail("Credenciales inválidas");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return fail("Credenciales inválidas");
  }

  const accessToken = await signAccessToken(user.id, user.role);
  const refreshToken = await createRefreshToken(user.id);

  const response = isFormSubmit
    ? NextResponse.redirect(new URL(redirectTo, request.url), { status: 303 })
    : NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferredLang: user.preferredLang,
      country: user.country,
    },
  });

  setAuthCookies(response, accessToken, refreshToken);
  return response;
}
