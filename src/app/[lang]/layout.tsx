import { getLangFromParams, getDictionary } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return {
    title: { es: "EdPlatform", en: "EdPlatform" }[lang as "es" | "en"] || "EdPlatform",
    description:
      lang === "en"
        ? "Online Course Platform with Verifiable Certificates"
        : "Plataforma de Cursos Online con Certificados Verificables",
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLangFromParams({ lang });
  const dict = getDictionary(locale);
  const session = await getSession();

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar lang={locale} dict={dict} session={session} />
      <main className="flex-1" role="main">{children}</main>
      <Footer lang={locale} dict={dict} />
      {/* Schema.org EducationalOrganization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            name: "EdPlatform",
            url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
            description:
              "Plataforma de educación en línea con certificados digitales verificables Open Badges 3.0 y W3C Verifiable Credentials.",
            knowsLanguage: ["es", "en"],
          }),
        }}
      />
    </div>
  );
}
