"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { EvaluationForm } from "@/components/evaluations/EvaluationForm";

type Evaluation = {
  id: string;
  title: { es: string; en: string };
  description?: { es: string; en: string };
  passingScore: number;
  questions: Array<{
    id: string;
    type: "MCQ" | "TRUEFALSE" | "SHORT";
    question: { es: string; en: string };
    options?: { es: string; en: string }[];
    points: number;
  }>;
};

export function PartialEvaluation({ evaluationId, title, type = "PARTIAL", lang }: { evaluationId: string; title: { es: string; en: string }; type?: "PARTIAL" | "AUTOEVALUATION"; lang: string }) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const t = (es: string, en: string) => (lang === "en" ? en : es);

  async function start() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/evaluations?evaluationId=${encodeURIComponent(evaluationId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || t("No se pudo cargar la evaluación", "The evaluation could not be loaded"));
      if (body.alreadyPassed) {
        setMessage(t("Ya aprobaste esta evaluación.", "You have already passed this evaluation."));
      } else {
        setEvaluation(body.data);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("No se pudo cargar la evaluación", "The evaluation could not be loaded"));
    } finally {
      setLoading(false);
    }
  }

  if (evaluation) {
    return <EvaluationForm evaluation={evaluation} lang={lang} onSubmit={async (answers) => {
      const response = await fetch(`/api/evaluations/${evaluation.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || t("No se pudo enviar la evaluación", "The evaluation could not be submitted"));
      return body.data;
    }} />;
  }

  return (
    <section className="mt-5 border border-[#c9dceb] bg-[#f7fbff] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#17212b]">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          {type === "AUTOEVALUATION" ? t("Autoevaluación", "Self-assessment") : t("Evaluación parcial", "Partial assessment")}: {lang === "en" ? title.en || title.es : title.es || title.en}
        </div>
        <button onClick={start} disabled={loading} className="inline-flex items-center gap-2 border border-primary px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-white disabled:opacity-50">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardCheck className="h-3.5 w-3.5" />}
          {t("Realizar evaluación", "Take assessment")}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-[#52667a]">{message}</p>}
    </section>
  );
}
