import Link from "next/link";
import { BookOpenCheck, GraduationCap, Mail, ShieldCheck } from "lucide-react";
import type { getDictionary } from "@/lib/i18n";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";
type Dict = ReturnType<typeof getDictionary>;

export function Footer({ lang, dict }: { lang: string; dict: Dict }) {
  const t = (es: string, en: string) => (lang === "en" ? en : es);
  return (
    <footer className="bg-primary text-white" role="contentinfo">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href={`/${lang}`} className="mb-4 flex items-center gap-3 font-bold text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12">
                <GraduationCap className="h-6 w-6" />
              </span>
              <span className="text-lg">{APP_NAME}</span>
            </Link>
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

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">{t("Capacidades","Capabilities")}</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-sm text-white/75"><BookOpenCheck className="h-4 w-4 text-white" />{t("Cursos MOOC", "MOOC courses")}</li>
              <li className="flex items-center gap-2 text-sm text-white/75"><ShieldCheck className="h-4 w-4 text-white" />{t("Certificación digital", "Digital certification")}</li>
              <li className="flex items-center gap-2 text-sm text-white/75"><Mail className="h-4 w-4 text-white" />{t("Soporte académico", "Academic support")}</li>
            </ul>
          </div>

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
            {t(
              "Esta plataforma está soportada por la Red Nacional de Investigación y Educación de Avanzada (Reduniv) del Ministerio de Educación Superior de la República de Cuba.",
              "This platform is supported by the National Advanced Research and Education Network (Reduniv) of the Ministry of Higher Education of the Republic of Cuba.",
            )}
          </p>
        </div>
        <div className="border-t border-white/10">
          <div className="container mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-3 text-xs text-white/70">
            <span>© {new Date().getFullYear()} {APP_NAME}</span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span>{t("Plataforma MOOC institucional", "Institutional MOOC platform")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
