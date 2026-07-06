import type { Metadata } from "next";
import "@/app/globals.css";
import { APP_DESCRIPTION, APP_NAME, APP_URL } from "@/lib/app-config";

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
  return (
    <html lang="es" suppressHydrationWarning>
      <body style={{background:"#fff",color:"#1a1a2e"}} className="min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
