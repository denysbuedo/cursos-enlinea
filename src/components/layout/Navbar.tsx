"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, GraduationCap, Menu, X } from "lucide-react";
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
  const headerLinkTone = isNae
    ? "text-[#41bcff] hover:bg-[#002c42] hover:text-[#80d2ff]"
    : "text-white/90 hover:bg-white/10 hover:text-white";
  const otherLang = lang === "es" ? "en" : "es";
  const otherLangPath = pathname.replace(/^\/(es|en)/, `/${otherLang}`);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { router.push(`/${lang}`); router.refresh(); }
  };

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${pathname.includes(path)
      ? isNae ? "bg-[#41bcff] text-[#00293b]" : "bg-white text-primary"
      : headerLinkTone}`;

  return (
    <>
      <header className={`sticky top-0 z-50 shadow-sm ${isNae ? "bg-[#00171f]" : "bg-primary"}`} role="banner">
      <nav className={`container mx-auto flex items-center justify-between px-4 ${isNae ? "h-[4.5rem] lg:h-20" : "h-16"}`}>
        <Link href={`/${lang}`} className={`flex items-center gap-2.5 text-white font-bold text-lg ${isNae ? "lg:ml-16" : ""}`}>
          {isNae ? (
            <span className="nae-header-logo" role="img" aria-label="NAE Formación en línea" />
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
            <Link href={`/${lang}/dashboard/cms`} className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${headerLinkTone}`}>CMS</Link>
          )}
          {session?.role === "ADMIN" && (
            <Link href={`/${lang}/dashboard/admin`} className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${headerLinkTone}`}>{dict.nav.admin}</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href={otherLangPath} className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${isNae ? "bg-[#002c42] text-white hover:bg-[#41bcff] hover:text-[#00293b]" : "bg-white/10 text-white/90 hover:bg-white hover:text-primary"}`}>{lang === "es" ? "EN" : "ES"}</Link>
          {session ? (
            <button onClick={handleLogout} disabled={loggingOut} title={dict.nav.logout} aria-label={dict.nav.logout} className={`inline-flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ml-1 ${isNae ? "text-[#41bcff] hover:text-[#80d2ff]" : "text-white/80 hover:text-white"}`}>
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">{loggingOut ? "..." : dict.nav.logout}</span>
            </button>
          ) : (
            <Link href={`/${lang}/login`} className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ml-1 ${headerLinkTone}`}>{dict.nav.login}</Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className={`lg:hidden ml-1 p-2 rounded-lg hover:bg-white/10 ${isNae ? "text-[#41bcff]" : "text-white/90"}`} aria-label="Menú">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className={`lg:hidden border-t border-white/10 px-4 py-3 space-y-1 ${isNae ? "bg-[#00171f]" : "bg-primary"}`}>
          <Link href={`/${lang}/courses`} className={`block px-3 py-2.5 rounded-lg ${headerLinkTone}`} onClick={() => setMobileOpen(false)}>{dict.nav.courses}</Link>
          <Link href={`/${lang}/dashboard`} className={`block px-3 py-2.5 rounded-lg ${headerLinkTone}`} onClick={() => setMobileOpen(false)}>{dict.nav.dashboard}</Link>
          {(session?.role === "ADMIN" || session?.role === "INSTRUCTOR") && <Link href={`/${lang}/dashboard/cms`} className={`block px-3 py-2.5 rounded-lg ${headerLinkTone}`} onClick={() => setMobileOpen(false)}>CMS</Link>}
          {session?.role === "ADMIN" && <Link href={`/${lang}/dashboard/admin`} className={`block px-3 py-2.5 rounded-lg ${headerLinkTone}`} onClick={() => setMobileOpen(false)}>{dict.nav.admin}</Link>}
          {session && <button onClick={handleLogout} disabled={loggingOut} className={`flex w-full items-center gap-2 px-3 py-2.5 text-left disabled:opacity-50 ${headerLinkTone}`}><LogOut className="h-4 w-4" />{loggingOut ? "..." : dict.nav.logout}</button>}
        </div>
      )}
      </header>
    </>
  );
}
