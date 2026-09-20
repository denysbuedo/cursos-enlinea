import { NextRequest, NextResponse } from "next/server";
import { googleConfigured, googleRedirectUri, oauthRandom, pkceChallenge } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  if (!googleConfigured()) return NextResponse.json({ error: "Google no está configurado" }, { status: 503 });

  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "en" : "es";
  const state = oauthRandom();
  const verifier = oauthRandom(48);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", googleRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", pkceChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");

  const response = NextResponse.redirect(url);
  const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/api/auth/google", maxAge: 600 };
  response.cookies.set("google_oauth_state", state, cookieOptions);
  response.cookies.set("google_oauth_verifier", verifier, cookieOptions);
  response.cookies.set("google_oauth_lang", lang, cookieOptions);
  return response;
}
