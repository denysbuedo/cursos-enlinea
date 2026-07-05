"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Award } from "lucide-react";

interface Question {
  id: string;
  type: "MCQ" | "TRUEFALSE" | "SHORT";
  question: { es: string; en: string };
  options?: { es: string; en: string }[];
  points: number;
}

interface EvaluationData {
  id: string;
  title: { es: string; en: string };
  description?: { es: string; en: string };
  passingScore: number;
  questions: Question[];
}

interface EvaluationResult {
  score: number;
  passed: boolean;
  passingScore: number;
  totalPoints: number;
  earnedPoints: number;
  attemptCount?: number;
  remainingAttempts?: number;
  maxAttempts?: number;
  feedback?: Array<{
    questionId: string;
    correct: boolean;
    points: number;
    earnedPoints: number;
    feedback?: { es?: string; en?: string };
    correctAnswer?: string;
  }>;
}

interface EvaluationFormProps {
  evaluation: EvaluationData;
  lang: string;
  onSubmit: (answers: { questionId: string; answer: string }[]) => Promise<EvaluationResult>;
}

export function EvaluationForm({
  evaluation,
  lang,
  onSubmit,
}: EvaluationFormProps) {
  const [answers, setAnswers] = useState<
    Record<string, string>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    // Validar que todas las preguntas estén respondidas
    const unanswered = evaluation.questions.filter(
      (q) => !answers[q.id] || answers[q.id].trim() === ""
    );
    if (unanswered.length > 0) {
      setError(
        t(
          `Faltan ${unanswered.length} preguntas por responder`,
          `${unanswered.length} questions left to answer`
        )
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const answerList = evaluation.questions.map((q) => ({
        questionId: q.id,
        answer: answers[q.id],
      }));
      const evalResult = await onSubmit(answerList);
      setResult(evalResult);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("Error", "Error")
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const feedbackByQuestion = new Map((result.feedback || []).map((item) => [item.questionId, item]));
    return (
      <div className="rounded-xl border p-6">
        <div className="text-center">
          {result.passed ? (
            <>
              <Award className="w-16 h-16 mx-auto text-amber-500 mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2">
                {t("¡Aprobado!", "Passed!")}
              </h3>
            </>
          ) : (
            <>
              <XCircle className="w-16 h-16 mx-auto text-black mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2">
                {t("No aprobado", "Not passed")}
              </h3>
            </>
          )}
          <p className="text-[#7b8fa1] mb-2">
            {t(
              `Obtuviste ${result.score}% (mínimo requerido: ${result.passingScore}%)`,
              `You scored ${result.score}% (minimum required: ${result.passingScore}%)`
            )}
          </p>
          <p className="text-sm text-[#7b8fa1]">
            {t(
              `${result.earnedPoints} de ${result.totalPoints} puntos`,
              `${result.earnedPoints} out of ${result.totalPoints} points`
            )}
          </p>
          {typeof result.remainingAttempts === "number" && !result.passed && (
            <p className="mt-2 text-sm text-[#7b8fa1]">
              {t(
                `Intentos restantes: ${result.remainingAttempts}`,
                `Remaining attempts: ${result.remainingAttempts}`
              )}
            </p>
          )}
        </div>

        {result.feedback && result.feedback.length > 0 && (
          <div className="mt-6 space-y-3 text-left">
            {evaluation.questions.map((question, index) => {
              const item = feedbackByQuestion.get(question.id);
              if (!item) return null;
              const feedbackText = lang === "en"
                ? item.feedback?.en || item.feedback?.es
                : item.feedback?.es || item.feedback?.en;
              return (
                <div key={question.id} className="rounded-lg border p-4">
                  <div className="flex items-start gap-2">
                    {item.correct ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-700" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-700" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {index + 1}. {t(question.question.es, question.question.en)}
                      </p>
                      <p className="mt-1 text-xs text-[#7b8fa1]">
                        {item.earnedPoints}/{item.points} {t("puntos", "points")}
                      </p>
                      {feedbackText && (
                        <p className="mt-2 text-sm text-[#52667a]">{feedbackText}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!result.passed && (result.remainingAttempts ?? 1) > 0 && (
          <button
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
            className="mx-auto mt-6 block text-primary hover:underline text-sm"
          >
            {t("Intentar de nuevo", "Try again")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {evaluation.description && (
        <div className="p-4 rounded-lg bg-[#e8ecf1]/30 text-sm text-[#7b8fa1]">
          {t(evaluation.description.es, evaluation.description.en)}
        </div>
      )}

      {evaluation.questions.map((q, idx) => (
        <div key={q.id} className="p-5 rounded-xl border space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              <span className="text-[#7b8fa1] mr-2">{idx + 1}.</span>
              {t(q.question.es, q.question.en)}
            </p>
            <span className="text-xs text-[#7b8fa1] flex-shrink-0">
              {q.points} {q.points === 1 ? "pt" : "pts"}
            </span>
          </div>

          {/* MCQ */}
          {q.type === "MCQ" && q.options && (
            <div className="space-y-2" role="radiogroup" aria-label={t(q.question.es, q.question.en)}>
              {q.options.map((opt, oIdx) => (
                <label
                  key={oIdx}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    answers[q.id] === t(opt.es, opt.en)
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={t(opt.es, opt.en)}
                    checked={answers[q.id] === t(opt.es, opt.en)}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">
                    {t(opt.es, opt.en)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* True/False */}
          {q.type === "TRUEFALSE" && (
            <div className="flex gap-3" role="radiogroup" aria-label={t(q.question.es, q.question.en)}>
              {[
                { value: "true", labelEs: "Verdadero", labelEn: "True" },
                { value: "false", labelEs: "Falso", labelEn: "False" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    answers[q.id] === opt.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.value}
                    checked={answers[q.id] === opt.value}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm font-medium">
                    {t(opt.labelEs, opt.labelEn)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* Short answer */}
          {q.type === "SHORT" && (
            <input
              type="text"
              placeholder={t("Escribe tu respuesta...", "Type your answer...")}
              value={answers[q.id] || ""}
              onChange={(e) => handleAnswer(q.id, e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border bg-[#fafbfc] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>
      ))}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#c0392b]/10 text-black text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-lg bg-primary px-6 py-3.5 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <CheckCircle2 className="w-5 h-5" />
        )}
        {t("Enviar respuestas", "Submit answers")}
      </button>
    </div>
  );
}
