"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import type { getDictionary } from "@/lib/i18n";
import { APP_NAME } from "@/lib/app-config";

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
  const otherLang = lang === "es" ? "en" : "es";
  const otherLangPath = pathname.replace(/^\/(es|en)/, `/${otherLang}`);

  const handleLogout = async () => { setLoggingOut(true); await fetch("/api/auth/logout", { method: "POST" }); router.push(`/${lang}`); router.refresh(); };

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${pathname.includes(path) ? "bg-white text-primary" : "text-white/90 hover:text-white hover:bg-white/10"}`;

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-sm" role="banner">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href={`/${lang}`} className="flex items-center gap-2.5 text-white font-bold text-lg">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/12"><GraduationCap className="w-5 h-5" /></div>
          <span className="hidden sm:inline">{APP_NAME}</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          <Link href={`/${lang}/courses`} className={linkClass("/courses")}>{dict.nav.courses}</Link>
          <Link href={`/${lang}/dashboard`} className={linkClass("/dashboard")}>{dict.nav.dashboard}</Link>
          {(session?.role === "ADMIN" || session?.role === "INSTRUCTOR") && (
            <Link href={`/${lang}/dashboard/cms`} className="text-sm font-medium text-white/90 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">CMS</Link>
          )}
          {session?.role === "ADMIN" && (
            <Link href={`/${lang}/dashboard/admin`} className="text-sm font-medium text-white hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">{dict.nav.admin}</Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link href={otherLangPath} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/10 text-white/90 hover:bg-white hover:text-primary transition-colors">{lang === "es" ? "EN" : "ES"}</Link>
          {session ? (
            <button onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors disabled:opacity-50 ml-1">
              <LogOut className="w-4 h-4" /><span className="hidden sm:inline">{loggingOut ? "..." : dict.nav.logout}</span>
            </button>
          ) : (
            <Link href={`/${lang}/login`} className="text-sm font-medium text-white/90 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1">{dict.nav.login}</Link>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden ml-1 p-2 rounded-lg text-white/90 hover:bg-white/10" aria-label="Menú">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-primary px-4 py-3 space-y-1">
          <Link href={`/${lang}/courses`} className="block px-3 py-2.5 rounded-lg text-white/90 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>{dict.nav.courses}</Link>
          <Link href={`/${lang}/dashboard`} className="block px-3 py-2.5 rounded-lg text-white/90 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>{dict.nav.dashboard}</Link>
          {(session?.role === "ADMIN" || session?.role === "INSTRUCTOR") && <Link href={`/${lang}/dashboard/cms`} className="block px-3 py-2.5 rounded-lg text-white/90 hover:bg-white/10 hover:text-white" onClick={() => setMobileOpen(false)}>CMS</Link>}
          {session?.role === "ADMIN" && <Link href={`/${lang}/dashboard/admin`} className="block px-3 py-2.5 rounded-lg text-white hover:bg-white/10" onClick={() => setMobileOpen(false)}>{dict.nav.admin}</Link>}
        </div>
      )}
    </header>
  );
}
