"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Globe2, LogOut, GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import type { getDictionary } from "@/lib/i18n";
import { APP_NAME } from "@/lib/app-config";
import { PLATFORM_ID } from "@/lib/platform-config";

type Dict = ReturnType<typeof getDictionary>;

interface SessionInfo {
  userId: string;
  role: string;
}

export function Navbar({ lang, dict, session }: { lang: string; dict: Dict; session: SessionInfo | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isNae = PLATFORM_ID === "nae";
  const isReduniv = PLATFORM_ID === "reduniv";
  const headerLinkTone = isNae
    ? "text-[#41bcff] hover:bg-[#002c42] hover:text-[#80d2ff]"
    : isReduniv
      ? "reduniv-nav-link"
      : "text-white/90 hover:bg-white/10 hover:text-white";
  const otherLang = lang === "es" ? "en" : "es";
  const otherLangPath = pathname.replace(/^\/(es|en)/, `/${otherLang}`);
  const currentLanguage = lang === "es" ? "ES" : "EN";
  const otherLanguage = lang === "es" ? "EN" : "ES";

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { router.push(`/${lang}`); router.refresh(); }
  };

  const linkClass = (path: string) => {
    const isDashboardRoot = path === "/dashboard";
    const isActive = isReduniv && isDashboardRoot
      ? pathname === `/${lang}/dashboard`
      : pathname.includes(path);

    if (isReduniv) {
      return `reduniv-nav-link ${isActive ? "reduniv-nav-link-active" : ""}`;
    }

    return `text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${isActive
      ? isNae ? "bg-[#41bcff] text-[#00293b]" : "bg-white text-primary"
      : headerLinkTone}`;
  };

  const auxiliaryLinkClass = (path: string) => isReduniv
    ? linkClass(path)
    : `text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${headerLinkTone}`;

  const mobileLinkClass = (path: string) => {
    const isDashboardRoot = path === "/dashboard";
    const isActive = isReduniv && isDashboardRoot
      ? pathname === `/${lang}/dashboard`
      : pathname.includes(path);

    if (isReduniv) {
      return `reduniv-mobile-nav-link ${isActive ? "reduniv-mobile-nav-link-active" : ""}`;
    }

    return `block px-3 py-2.5 rounded-lg ${headerLinkTone}`;
  };

  return (
    <>
      <header className={`sticky top-0 z-50 ${isNae ? "shadow-sm bg-[#00171f]" : isReduniv ? "reduniv-header" : "shadow-sm bg-primary"}`} role="banner">
      <nav className={`container mx-auto flex items-center justify-between px-4 ${isNae ? "h-[4.5rem] lg:h-20" : isReduniv ? "reduniv-header-nav" : "h-16"}`}>
        <Link href={`/${lang}`} className={`flex items-center gap-2.5 font-bold text-lg ${isNae ? "text-white lg:ml-16" : isReduniv ? "reduniv-header-brand" : "text-white"}`}>
          {isNae ? (
            <span className="nae-header-logo" role="img" aria-label="NAE Formación en línea" />
          ) : isReduniv ? (
            <span className="reduniv-header-logo" role="img" aria-label="APRENDE. Formación en línea" />
          ) : (
            <>
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/12"><GraduationCap className="w-5 h-5" /></div>
              <span className="hidden sm:inline" title={APP_NAME}>{APP_NAME}</span>
            </>
          )}
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          <Link href={`/${lang}/courses`} className={linkClass("/courses")}>{dict.nav.courses}</Link>
          <Link href={`/${lang}/dashboard`} className={linkClass("/dashboard")}>{dict.nav.dashboard}</Link>
          {(session?.role === "ADMIN" || session?.role === "INSTRUCTOR") && (
            <Link href={`/${lang}/dashboard/cms`} className={auxiliaryLinkClass("/dashboard/cms")}>CMS</Link>
          )}
          {session?.role === "ADMIN" && (
            <Link href={`/${lang}/dashboard/admin`} className={auxiliaryLinkClass("/dashboard/admin")}>{dict.nav.admin}</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isReduniv ? (
            <div className="reduniv-language-switcher" aria-label="Idioma">
              <Globe2 className="reduniv-language-icon" aria-hidden="true" />
              <span className="reduniv-language-option reduniv-language-current" aria-current="page">{currentLanguage}</span>
              <Link href={otherLangPath} className="reduniv-language-option">{otherLanguage}</Link>
            </div>
          ) : (
            <Link href={otherLangPath} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${isNae ? "bg-[#002c42] text-white hover:bg-[#41bcff] hover:text-[#00293b]" : "bg-white/10 text-white/90 hover:bg-white hover:text-primary"}`}>{otherLanguage}</Link>
          )}
          {session ? (
            <button onClick={handleLogout} disabled={loggingOut} title={dict.nav.logout} aria-label={dict.nav.logout} className={`inline-flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ml-1 ${isNae ? "text-[#41bcff] hover:text-[#80d2ff]" : isReduniv ? "reduniv-header-logout" : "text-white/80 hover:text-white"}`}>
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">{loggingOut ? "..." : dict.nav.logout}</span>
            </button>
          ) : (
            <Link href={`/${lang}/login`} className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ml-1 ${isReduniv ? "reduniv-login-button" : headerLinkTone}`}>{dict.nav.login}</Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className={`lg:hidden ml-1 p-2 rounded-lg ${isNae ? "text-[#41bcff] hover:bg-white/10" : isReduniv ? "reduniv-menu-button" : "text-white/90 hover:bg-white/10"}`} aria-label="Menú">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className={`lg:hidden px-4 py-3 space-y-1 ${isNae ? "border-t border-white/10 bg-[#00171f]" : isReduniv ? "reduniv-mobile-menu" : "border-t border-white/10 bg-primary"}`}>
          <Link href={`/${lang}/courses`} className={mobileLinkClass("/courses")} onClick={() => setMobileOpen(false)}>{dict.nav.courses}</Link>
          <Link href={`/${lang}/dashboard`} className={mobileLinkClass("/dashboard")} onClick={() => setMobileOpen(false)}>{dict.nav.dashboard}</Link>
          {(session?.role === "ADMIN" || session?.role === "INSTRUCTOR") && <Link href={`/${lang}/dashboard/cms`} className={mobileLinkClass("/dashboard/cms")} onClick={() => setMobileOpen(false)}>CMS</Link>}
          {session?.role === "ADMIN" && <Link href={`/${lang}/dashboard/admin`} className={mobileLinkClass("/dashboard/admin")} onClick={() => setMobileOpen(false)}>{dict.nav.admin}</Link>}
          {session && <button onClick={handleLogout} disabled={loggingOut} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left disabled:opacity-50 ${isReduniv ? "reduniv-mobile-logout" : headerLinkTone}`}><LogOut className="h-4 w-4" />{loggingOut ? "..." : dict.nav.logout}</button>}
        </div>
      )}
      </header>
    </>
  );
}
