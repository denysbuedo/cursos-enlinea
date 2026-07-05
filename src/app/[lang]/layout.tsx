import { getLangFromParams, getDictionary } from "@/lib/i18n";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { APP_DESCRIPTION, APP_NAME, APP_URL } from "@/lib/app-config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  return {
    title: APP_NAME,
    description: lang === "en" ? APP_DESCRIPTION.en : APP_DESCRIPTION.es,
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
            name: APP_NAME,
            url: APP_URL,
            description: APP_DESCRIPTION.es,
            knowsLanguage: ["es", "en"],
          }),
        }}
      />
    </div>
  );
}
