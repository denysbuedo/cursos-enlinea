"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getLangFromParams } from "@/lib/i18n";

export default function VerifyEmailPage() {
  const params = useParams<{ lang: string }>();
  const lang = getLangFromParams(params);
  const [message, setMessage] = useState("Confirmando tu correo...");
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setTimeout(() => { setMessage("El enlace de confirmación no es válido."); setError(true); }, 0);
      return;
    }
    fetch("/api/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setMessage(data.message); })
      .catch((err: unknown) => { setError(true); setMessage(err instanceof Error ? err.message : "No se pudo confirmar el correo."); });
  }, []);

  return <main className="container mx-auto max-w-md px-4 py-20 text-center">
    <h1 className="text-2xl font-bold">{error ? "No se pudo confirmar" : "Confirmación de correo"}</h1>
    <p className={`mt-4 text-sm ${error ? "text-destructive" : "text-[#52667a]"}`}>{message}</p>
    <Link href={`/${lang}/login`} className="mt-8 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white">Iniciar sesión</Link>
  </main>;
}
