import Link from "next/link";
import { ArrowUpRight, BookOpenCheck, GraduationCap, Mail, ShieldCheck } from "lucide-react";
import type { getDictionary } from "@/lib/i18n";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";
import { PLATFORM_CONFIG, PLATFORM_ID } from "@/lib/platform-config";
type Dict = ReturnType<typeof getDictionary>;

function NaeFooter({ lang, dict }: { lang: string; dict: Dict }) {
  const t = (es: string, en: string) => (lang === "en" ? en : es);

  return (
    <footer className="nae-footer" role="contentinfo">
      <div className="nae-footer-main">
        <div className="container mx-auto grid gap-8 px-4 py-6 sm:grid-cols-[1.45fr_1fr_1fr] sm:gap-10 sm:px-8 sm:py-8">
          <Link
            href={`/${lang}`}
            className="nae-footer-logo"
            role="img"
            aria-label={t(
              "NAE Formación en línea. Fortalecimiento de capacidades",
              "NAE Online Training. Capacity building",
            )}
          />

          <nav aria-label={t("Enlaces de la plataforma", "Platform links")}>
            <h2 className="nae-footer-heading">{t("Plataforma", "Platform")}</h2>
            <ul className="nae-footer-links">
              <li><Link href={`/${lang}/courses`}>{dict.nav.courses}</Link></li>
              <li><Link href={`/${lang}/dashboard`}>{dict.nav.dashboard}</Link></li>
              <li><Link href={`/${lang}/login`}>{dict.nav.login}</Link></li>
            </ul>
          </nav>

          <nav aria-label={t("Enlaces legales", "Legal links")}>
            <h2 className="nae-footer-heading">{t("Legal", "Legal")}</h2>
            <ul className="nae-footer-links">
              <li><Link href={`/${lang}/terms`}>{dict.footer.terms}</Link></li>
              <li><Link href={`/${lang}/privacy`}>{dict.footer.privacy}</Link></li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="nae-footer-bottom">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-4 text-center text-xs text-[#7fa8ba]">
          <span>© {new Date().getFullYear()} {t("Impulso a Nuevos Actores Económicos", "Supporting New Economic Actors")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("Plataforma MOOC institucional", "Institutional MOOC platform")}</span>
        </div>
      </div>
    </footer>
  );
}

export function Footer({ lang, dict }: { lang: string; dict: Dict }) {
  const t = (es: string, en: string) => (lang === "en" ? en : es);
  if (PLATFORM_ID === "nae") {
    return <NaeFooter lang={lang} dict={dict} />;
  }
  const isNae = PLATFORM_CONFIG.shortName === "NAE";
  return (
    <footer className={`text-white ${isNae ? "bg-[#00293b]" : "bg-primary"}`} role="contentinfo">
      <div className="container mx-auto px-4 py-10">
        <div className={`grid grid-cols-1 gap-8 sm:grid-cols-2 ${isNae ? "lg:grid-cols-[1.6fr_1fr_1fr]" : "lg:grid-cols-[1.4fr_1fr_1fr_1fr]"}`}>
          <div>
            <Link href={`/${lang}`} className="mb-4 flex items-center gap-3 font-bold text-white">
              {isNae ? (
                <span className="nae-brand-lockup">
                  <span className="nae-brand-mark"><ArrowUpRight className="h-5 w-5" strokeWidth={2.8} /></span>
                  <span>
                    <strong>NAE</strong>
                    <small>Formación en línea</small>
                  </span>
                </span>
              ) : (
                <>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12">
                    <GraduationCap className="h-6 w-6" />
                  </span>
                  <span className="text-lg">{APP_NAME}</span>
                </>
              )}
            </Link>
            {isNae && <p className="mb-4 text-lg font-bold leading-tight text-white">Fortalecimiento de capacidades</p>}
            <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
              {t("Institucional", "Institutional")}
            </h4>
            <p className="mt-3 text-sm text-white/75 leading-relaxed">{t(APP_DESCRIPTION.es, APP_DESCRIPTION.en)}</p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{t("Plataforma","Platform")}</h4>
            <ul className="space-y-2">
              <li><Link href={`/${lang}/courses`} className="text-sm text-white/75 hover:text-white">{dict.nav.courses}</Link></li>
              <li><Link href={`/${lang}/dashboard`} className="text-sm text-white/75 hover:text-white">{dict.nav.dashboard}</Link></li>
              <li><Link href={`/${lang}/login`} className="text-sm text-white/75 hover:text-white">{dict.nav.login}</Link></li>
            </ul>
          </div>

          {!isNae && <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{t("Capacidades","Capabilities")}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-white/75"><BookOpenCheck className="h-4 w-4 text-white" />{t("Cursos MOOC", "MOOC courses")}</li>
              <li className="flex items-center gap-2 text-sm text-white/75"><ShieldCheck className="h-4 w-4 text-white" />{t("Certificación digital", "Digital certification")}</li>
              <li className="flex items-center gap-2 text-sm text-white/75"><Mail className="h-4 w-4 text-white" />{t("Soporte académico", "Academic support")}</li>
            </ul>
          </div>}

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{t("Legal","Legal")}</h4>
            <ul className="space-y-2">
              <li><Link href={`/${lang}/terms`} className="text-sm text-white/75 hover:text-white">{dict.footer.terms}</Link></li>
              <li><Link href={`/${lang}/privacy`} className="text-sm text-white/75 hover:text-white">{dict.footer.privacy}</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/12 bg-black/10">
        <div className="container mx-auto px-4 py-3">
          <p className="mx-auto max-w-6xl text-center text-[11px] leading-4 text-white/70">
            {t(PLATFORM_CONFIG.institutionalSupport.es, PLATFORM_CONFIG.institutionalSupport.en)}
          </p>
        </div>
        <div className="border-t border-white/10">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-xs text-white/70">
            <span>© {new Date().getFullYear()} {isNae ? t("Impulso a Nuevos Actores Económicos", "Supporting New Economic Actors") : APP_NAME}</span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span>{t("Plataforma MOOC institucional", "Institutional MOOC platform")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
