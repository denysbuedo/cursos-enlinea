"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDictionary, getLangFromParams } from "@/lib/i18n";

export default function LoginPage() {
  const params = useParams<{ lang: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = getLangFromParams(params);
  const dict = getDictionary(lang);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(searchParams.get("error") || "");
  const [loading, setLoading] = useState(false);

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        let data: { error?: string } = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }
        throw new Error(data.error || "Error");
      }

      router.push(`/${lang}/dashboard`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("Error al iniciar sesión", "Login error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md py-20 px-4">
      <h1 className="text-2xl font-bold text-center mb-2">
        {dict.auth.loginTitle}
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        {lang === "en"
          ? "Access your courses and certificates."
          : "Accede a tus cursos y certificados."}
      </p>

      <form action="/api/auth/login" method="post" onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="redirectTo" value={`/${lang}/dashboard`} />
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            {dict.auth.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="w-full px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            {dict.auth.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-6 py-3 text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              {t("Entrando...", "Signing in...")}
            </span>
          ) : (
            dict.auth.loginButton
          )}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        <span>{lang === "en" ? "or" : "o"}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <a
        href={`/api/auth/google/start?lang=${lang}`}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-white px-6 py-3 font-semibold transition-colors hover:bg-muted"
      >
        <span className="text-base font-bold" aria-hidden="true">G</span>
        {lang === "en" ? "Continue with Google" : "Continuar con Google"}
      </a>

      <div className="mt-4 text-center">
        <Link href={`/${lang}/forgot-password`} className="text-sm text-primary hover:underline">
          {dict.auth.forgotPassword}
        </Link>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-6">
        {dict.auth.noAccount}{" "}
        <Link
          href={`/${lang}/register`}
          className="text-primary hover:underline font-medium"
        >
          {dict.auth.registerButton}
        </Link>
      </p>
    </div>
  );
}
