"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDictionary, getLangFromParams } from "@/lib/i18n";
import { PaymentSelector } from "@/components/payments/PaymentSelector";
import { ProofUpload } from "@/components/payments/ProofUpload";
import {
  ArrowLeft,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface PaymentMethod {
  id: string;
  method: string;
  currency: string;
  label: { es: string; en: string };
  instructions: { es: string; en: string };
  accountInfo?: Record<string, string>;
  geoRestriction?: string;
}

export default function CheckoutPage() {
  const params = useParams<{ lang: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const lang = getLangFromParams(params);
  const dict = getDictionary(lang);
  const courseSlug = searchParams.get("course");

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [coursePrice, setCoursePrice] = useState<number>();
  const [courseCurrency, setCourseCurrency] = useState<string>();
  const [courseTitle, setCourseTitle] = useState("");
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  useEffect(() => {
    if (!courseSlug) {
      router.push(`/${lang}/courses`);
      return;
    }

    async function init() {
      setLoading(true);
      try {
        // 1. Obtener instrucciones de pago
        const res = await fetch(
          `/api/payments/instructions?courseSlug=${courseSlug}`
        );
        if (!res.ok) throw new Error("Error loading payment methods");
        const data = await res.json();

        if (data.message?.includes("gratuito")) {
          // Curso gratis: matricular directamente
          const enrollRes = await fetch("/api/enrollments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseSlug }),
          });

          if (enrollRes.ok) {
            const enrollData = await enrollRes.json();
            router.push(`/${lang}/courses/${courseSlug}`);
            return;
          }

          // Si ya está matriculado (409), redirigir
          if (enrollRes.status === 409) {
            router.push(`/${lang}/courses/${courseSlug}`);
            return;
          }

          // Si no autorizado, redirigir a login
          if (enrollRes.status === 401) {
            router.push(`/${lang}/login?redirect=/${lang}/checkout?course=${courseSlug}`);
            return;
          }
        }

        setMethods(data.data || []);
        setCoursePrice(data.coursePrice);
        setCourseCurrency(data.courseCurrency);

        // 2. Obtener título del curso
        const courseRes = await fetch(`/api/courses/${courseSlug}`);
        if (courseRes.ok) {
          const course = await courseRes.json();
          setCourseTitle(t(course.title.es, course.title.en));
        }

        // 3. Crear enrollment si no existe
        const enrollRes = await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseSlug }),
        });
        if (enrollRes.ok) {
          const enrollData = await enrollRes.json();
          setEnrollmentId(enrollData.data.id);
        } else if (enrollRes.status === 409) {
          const enrollData = await enrollRes.json();
          setEnrollmentId(enrollData.enrollment?.id || null);
        } else if (enrollRes.status === 401) {
          router.push(
            `/${lang}/login?redirect=/${lang}/checkout?course=${courseSlug}`
          );
          return;
        } else {
          const errData = await enrollRes.json().catch(() => ({}));
          setError(
            errData.error ||
              t("Error al crear la matrícula", "Error creating enrollment")
          );
        }
      } catch {
        setError(t("Error al cargar", "Error loading"));
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [courseSlug, lang, router]);

  const selected = methods.find((m) => m.method === selectedMethod);

  async function handleSubmit() {
    if (!selectedMethod) {
      setError(t("Selecciona un método de pago", "Select a payment method"));
      return;
    }

    if (!enrollmentId) {
      setError(
        t(
          "No se pudo crear la matrícula. Verifica que has iniciado sesión.",
          "Could not create enrollment. Make sure you are logged in."
        )
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("enrollmentId", enrollmentId);
      formData.set("method", selectedMethod);
      formData.set("amount", String(coursePrice || 0));
      formData.set("currency", courseCurrency || "USD");

      // Campos específicos según método
      // Para crypto, añadir cryptoTxHash si hay
      // Para bancos, bankReference
      if (file) {
        formData.set("file", file);
      }

      const res = await fetch("/api/payments/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error");
      }

      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("Error al enviar", "Submit error")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-20 px-4 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#7b8fa1]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="container mx-auto py-20 px-4 max-w-lg text-center">
        <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">
          {t("¡Pago registrado!", "Payment Registered!")}
        </h1>
        <p className="text-[#7b8fa1] mb-6">
          {t(
            "Tu comprobante ha sido enviado. Un administrador revisará tu pago y activará tu acceso al curso.",
            "Your proof has been submitted. An admin will review your payment and activate your course access."
          )}
        </p>
        <Link
          href={`/${lang}/dashboard`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-white font-medium hover:opacity-90"
        >
          {dict.nav.dashboard}
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      {/* Back button */}
      <Link
        href={`/${lang}/courses/${courseSlug}`}
        className="inline-flex items-center gap-1 text-sm text-[#7b8fa1] hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("Volver al curso", "Back to course")}
      </Link>

      <h1 className="text-2xl font-bold mb-2">
        {dict.payments.title}
        {courseTitle && `: ${courseTitle}`}
      </h1>

      {/* Compliance disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-[#e8ecf1]/50 text-xs text-[#7b8fa1] mb-8">
        <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>{dict.payments.disclaimer}</span>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[#c0392b]/10 text-black text-sm mb-6">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Select method */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">
          {t("1. Método de pago", "1. Payment Method")}
        </h2>
        <PaymentSelector
          methods={methods}
          selectedMethod={selectedMethod}
          onSelect={setSelectedMethod}
          lang={lang}
          coursePrice={coursePrice}
          courseCurrency={courseCurrency}
        />
      </div>

      {/* Step 2: Instructions */}
      {selected && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {t("2. Instrucciones", "2. Instructions")}
          </h2>
          <div className="rounded-xl border p-5 bg-[#e8ecf1]/20">
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {t(selected.instructions.es, selected.instructions.en)}
            </pre>
            {selected.accountInfo && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs font-medium text-[#7b8fa1] mb-2">
                  {t("Datos de la cuenta", "Account details")}:
                </p>
                {Object.entries(selected.accountInfo).map(([key, value]) => (
                  <p key={key} className="text-sm">
                    <span className="text-[#7b8fa1]">{key}: </span>
                    <code className="bg-[#e8ecf1] px-1.5 py-0.5 rounded text-xs">
                      {value}
                    </code>
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Upload proof */}
      {selected && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">
            {t("3. Subir comprobante", "3. Upload Proof")}
          </h2>
          <ProofUpload onFileSelected={setFile} lang={lang} />
        </div>
      )}

      {/* Submit */}
      {selected && (
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedMethod}
          className="w-full rounded-lg bg-primary px-6 py-3.5 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            dict.common.submit
          )}
        </button>
      )}
    </div>
  );
}
