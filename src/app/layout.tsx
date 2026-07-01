import type { Metadata } from "next";
import "@/app/globals.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "EdPlatform — Cursos Online con Certificados Verificables",
    template: "%s | EdPlatform",
  },
  description:
    "Plataforma de educación en línea con certificados digitales verificables (Open Badges 3.0 + W3C Verifiable Credentials) y firma criptográfica EdDSA. Cursos bilingües ES/EN con pasarela de pagos georresistente.",
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
  authors: [{ name: "EdPlatform" }],
  creator: "EdPlatform",
  publisher: "EdPlatform",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: "en_US",
    siteName: "EdPlatform",
    title: "EdPlatform — Cursos Online con Certificados Verificables",
    description:
      "Obtén credenciales digitales con reconocimiento internacional respaldadas por Open Badges 3.0 y W3C Verifiable Credentials.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "EdPlatform — Cursos Online con Certificados Verificables",
    description:
      "Certificados digitales verificables con firma criptográfica EdDSA. Open Badges 3.0 + W3C VC.",
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
