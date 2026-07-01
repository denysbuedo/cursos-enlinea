import { NextRequest, NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["es", "en"];
const DEFAULT_LOCALE = "es";
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/refresh",
  "/api/verify",
];

function getLocale(request: NextRequest): string {
  // 1. Subruta activa
  const pathname = request.nextUrl.pathname;
  const match = pathname.match(/^\/(es|en)(\/|$)/);
  if (match) return match[1];

  // 2. Cookie
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && SUPPORTED_LOCALES.includes(cookie)) return cookie;

  // 3. Accept-Language header
  const acceptLang = request.headers.get("accept-language")?.split(",")?.[0]?.split("-")?.[0];
  if (acceptLang && SUPPORTED_LOCALES.includes(acceptLang)) return acceptLang;

  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas especiales de Next.js que no deben ser interceptadas
  if (pathname === "/robots.txt") {
    return NextResponse.next();
  }

  // sitemap.xml → rewrite a API route para evitar conflicto con [lang]
  if (pathname === "/sitemap.xml") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/sitemap";
    return NextResponse.rewrite(url);
  }

  const locale = getLocale(request);

  // Rutas API públicas: permitir sin i18n redirect
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Redirigir raíz a idioma
  if (pathname === "/") {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  // Si la ruta no tiene prefijo de idioma, redirigir
  const hasLocale = pathname.match(/^\/(es|en)(\/|$)/);
  if (
    !hasLocale &&
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next") &&
    pathname !== "/robots.txt" &&
    pathname !== "/sitemap.xml"
  ) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
  }

  // Headers de seguridad
  const response = NextResponse.next();
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|.*\\.svg).*)",
  ],
};
