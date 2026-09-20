"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getLangFromParams } from "@/lib/i18n";

export default function ResetPasswordPage() {
  const params = useParams<{ lang: string }>();
  const lang = getLangFromParams(params);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setMessage("");
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setLoading(true);
    try {
      const token = new URLSearchParams(window.location.search).get("token");
      const res = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "Error"); setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo actualizar la contraseña."); }
    finally { setLoading(false); }
  }

  return <main className="container mx-auto max-w-md px-4 py-20">
    <h1 className="text-center text-2xl font-bold">Restablecer contraseña</h1>
    <form onSubmit={submit} className="mt-8 space-y-4">
      {message && <div className="rounded-lg bg-[#e8f6ef] p-3 text-center text-sm text-[#0f5132]">{message}</div>}
      {error && <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>}
      <label className="block text-sm font-medium" htmlFor="password">Nueva contraseña</label>
      <input id="password" type="password" required minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border bg-white px-4 py-2.5" />
      <label className="block text-sm font-medium" htmlFor="confirmation">Confirmar contraseña</label>
      <input id="confirmation" type="password" required minLength={10} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-lg border bg-white px-4 py-2.5" />
      <p className="text-xs text-[#7b8fa1]">Mínimo 10 caracteres, con mayúsculas, minúsculas y números.</p>
      <button disabled={loading} className="w-full rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Actualizando..." : "Actualizar contraseña"}</button>
    </form>
    <p className="mt-6 text-center text-sm"><Link href={`/${lang}/login`} className="text-primary hover:underline">Volver al inicio de sesión</Link></p>
  </main>;
}
