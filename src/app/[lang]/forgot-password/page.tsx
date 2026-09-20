"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDictionary, getLangFromParams } from "@/lib/i18n";

export default function ForgotPasswordPage() {
  const params = useParams<{ lang: string }>();
  const lang = getLangFromParams(params);
  const dict = getDictionary(lang);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Error"); setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo procesar la solicitud."); }
    finally { setLoading(false); }
  }

  return <main className="container mx-auto max-w-md px-4 py-20">
    <h1 className="text-center text-2xl font-bold">{dict.auth.forgotPassword}</h1>
    <p className="mt-2 text-center text-sm text-[#7b8fa1]">{lang === "en" ? "We will send instructions if the account exists." : "Te enviaremos instrucciones si la cuenta existe."}</p>
    <form onSubmit={submit} className="mt-8 space-y-4">
      {message && <div className="rounded-lg bg-[#e8f6ef] p-3 text-center text-sm text-[#0f5132]">{message}</div>}
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>}
      <label className="block text-sm font-medium" htmlFor="email">{dict.auth.email}</label>
      <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border bg-white px-4 py-2.5" />
      <button disabled={loading} className="w-full rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Enviando..." : "Enviar instrucciones"}</button>
    </form>
    <p className="mt-6 text-center text-sm"><Link href={`/${lang}/login`} className="text-primary hover:underline">Volver al inicio de sesión</Link></p>
  </main>;
}
