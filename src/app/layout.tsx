import type { Metadata } from "next";
import type { CSSProperties } from "react";
import "@/app/globals.css";
import { APP_DESCRIPTION, APP_NAME, APP_URL } from "@/lib/app-config";
import { PLATFORM_CONFIG, PLATFORM_ID } from "@/lib/platform-config";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Plataforma de Cursos en Línea`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION.es,
  keywords: [
    "cursos online",
    "certificados digitales",
    "Open Badges 3.0",
    "W3C Verifiable Credentials",
    "EdDSA",
    "educación en línea",
    "e-learning",
    "certificados verificables",
  ],
  authors: [{ name: APP_NAME }],
  creator: APP_NAME,
  publisher: APP_NAME,
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: "en_US",
    siteName: APP_NAME,
    title: `${APP_NAME} — Plataforma de Cursos en Línea`,
    description: APP_DESCRIPTION.es,
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Plataforma de Cursos en Línea`,
    description: APP_DESCRIPTION.es,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const platformStyle = {
    "--platform-primary": PLATFORM_CONFIG.theme.primary,
    "--platform-primary-hover": PLATFORM_CONFIG.theme.primaryHover,
    "--platform-accent": PLATFORM_CONFIG.theme.accent,
    "--platform-background": PLATFORM_CONFIG.theme.background,
    "--platform-secondary": PLATFORM_CONFIG.theme.secondary,
    "--platform-highlight": PLATFORM_CONFIG.theme.highlight,
  } as CSSProperties;

  return (
    <html lang="es" data-platform={PLATFORM_ID} suppressHydrationWarning>
      <body style={{ ...platformStyle, background: "#fff", color: "#1a1a2e" }} className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
