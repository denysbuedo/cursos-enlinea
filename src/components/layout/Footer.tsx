import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { getDictionary } from "@/lib/i18n";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app-config";
type Dict = ReturnType<typeof getDictionary>;

export function Footer({ lang, dict }: { lang: string; dict: Dict }) {
  const t = (es: string, en: string) => (lang === "en" ? en : es);
  return (
    <footer className="border-t border-border bg-white text-foreground" role="contentinfo">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <Link href={`/${lang}`} className="flex items-center gap-2.5 text-primary font-bold text-lg">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10"><GraduationCap className="w-5 h-5" /></div>{APP_NAME}
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">{t(APP_DESCRIPTION.es, APP_DESCRIPTION.en)}</p>
            <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} {APP_NAME}</p>
          </div>
          <div className="space-y-3"><h4 className="text-sm font-semibold text-primary uppercase tracking-wider">{t("Plataforma","Platform")}</h4><ul className="space-y-2"><li><Link href={`/${lang}/courses`} className="text-sm text-muted-foreground hover:text-primary">{dict.nav.courses}</Link></li><li><Link href={`/${lang}/dashboard`} className="text-sm text-muted-foreground hover:text-primary">{dict.nav.dashboard}</Link></li></ul></div>
          <div className="space-y-3"><h4 className="text-sm font-semibold text-primary uppercase tracking-wider">{t("Estándares","Standards")}</h4><ul className="space-y-2"><li><span className="text-sm text-muted-foreground">Open Badges 3.0</span></li><li><span className="text-sm text-muted-foreground">W3C Verifiable Credentials</span></li><li><span className="text-sm text-muted-foreground">EdDSA (Ed25519)</span></li></ul></div>
          <div className="space-y-3"><h4 className="text-sm font-semibold text-primary uppercase tracking-wider">{t("Legal","Legal")}</h4><ul className="space-y-2"><li><Link href={`/${lang}/terms`} className="text-sm text-muted-foreground hover:text-primary">{dict.footer.terms}</Link></li><li><Link href={`/${lang}/privacy`} className="text-sm text-muted-foreground hover:text-primary">{dict.footer.privacy}</Link></li><li><Link href={`/${lang}/contact`} className="text-sm text-muted-foreground hover:text-primary">{dict.footer.contact}</Link></li></ul></div>
        </div>
      </div>
      <div className="border-t border-border bg-muted/50"><div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-2"><p className="text-xs text-muted-foreground">{dict.footer.compliance}</p><div className="flex items-center gap-1 text-xs text-muted-foreground"><span>Open Badges 3.0</span><span>·</span><span>W3C VC</span><span>·</span><span>EdDSA</span></div></div></div>
    </footer>
  );
}
