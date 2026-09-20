import { NextRequest, NextResponse } from "next/server";
import { createRefreshToken, signAccessToken } from "@/lib/auth";
import { googleConfigured, googleRedirectUri, GOOGLE_PROVIDER } from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

type GoogleProfile = { sub?: string; email?: string; email_verified?: boolean; name?: string; picture?: string };

function clearOAuthCookies(response: NextResponse) {
  for (const name of ["google_oauth_state", "google_oauth_verifier", "google_oauth_lang"]) {
    response.cookies.set(name, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/google", maxAge: 0 });
  }
}

function failure(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/es/login?error=${encodeURIComponent(message)}`, request.url));
}

export async function GET(request: NextRequest) {
  if (!googleConfigured()) return failure(request, "Google no está configurado");
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("google_oauth_state")?.value;
  const verifier = request.cookies.get("google_oauth_verifier")?.value;
  const lang = request.cookies.get("google_oauth_lang")?.value === "en" ? "en" : "es";
  if (!code || !state || !storedState || state !== storedState || !verifier) return failure(request, "No se pudo validar el acceso con Google");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: googleRedirectUri(), grant_type: "authorization_code", code_verifier: verifier }),
    });
    if (!tokenResponse.ok) return failure(request, "Google no pudo validar la autorización");
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokens.access_token) return failure(request, "Google no devolvió un token válido");

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) return failure(request, "No se pudo consultar el perfil de Google");
    const profile = await profileResponse.json() as GoogleProfile;
    if (!profile.sub || !profile.email || profile.email_verified !== true) return failure(request, "Google no devolvió un correo verificado");

    const email = profile.email.trim().toLowerCase();
    const existingAccount = await prisma.oAuthAccount.findUnique({ where: { provider_providerAccountId: { provider: GOOGLE_PROVIDER, providerAccountId: profile.sub } } });
    let userId = existingAccount?.userId;
    if (!userId) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      const user = existingUser
        ? await prisma.user.update({ where: { id: existingUser.id }, data: { emailVerifiedAt: existingUser.emailVerifiedAt || new Date(), avatarUrl: existingUser.avatarUrl || profile.picture, name: existingUser.name || profile.name || email } })
        : await prisma.user.create({ data: { email, name: profile.name || email, avatarUrl: profile.picture, emailVerifiedAt: new Date(), passwordHash: null } });
      userId = user.id;
      await prisma.oAuthAccount.create({ data: { provider: GOOGLE_PROVIDER, providerAccountId: profile.sub, userId } });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const accessToken = await signAccessToken(user.id, user.role);
    const refreshToken = await createRefreshToken(user.id);
    const response = NextResponse.redirect(new URL(`/${lang}/dashboard`, request.url));
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("access_token", accessToken, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 15 * 60 });
    response.cookies.set("refresh_token", refreshToken, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: 7 * 24 * 60 * 60 });
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    console.error("Google OAuth error", error);
    return failure(request, "No se pudo completar el acceso con Google");
  }
}
