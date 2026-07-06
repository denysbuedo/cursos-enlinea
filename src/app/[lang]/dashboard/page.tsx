"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDictionary, getLangFromParams } from "@/lib/i18n";
import { Award, BookOpen, CheckCircle2, Clock, ArrowRight, Compass, Sparkles } from "lucide-react";
import { CertificateViewer } from "@/components/certificates/CertificateViewer";

interface EnrollmentData {
  id: string;
  courseId: string;
  status: string;
  progress: number;
  admissionType: string;
  createdAt: string;
  course: {
    slug: string;
    title: { es: string; en: string };
    _count: { sessions: number };
  };
}

interface CertData {
  id: string;
  badgeId: string;
  verificationUrl: string;
  isRevoked: boolean;
  revocationReason?: string;
  issuedAt: string;
  enrollment: {
    user: { name: string };
    course: { title: { es: string; en: string }; slug: string };
  };
}

export default function DashboardPage() {
  const params = useParams<{ lang: string }>();
  const router = useRouter();
  const lang = getLangFromParams(params);
  const dict = getDictionary(lang);
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [certificates, setCertificates] = useState<CertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [enrollRes, certRes] = await Promise.all([
          fetch("/api/enrollments/me"),
          fetch("/api/certificates"),
        ]);
        if (enrollRes.status === 401) { router.push(`/${lang}/login`); return; }
        if (enrollRes.ok) setEnrollments((await enrollRes.json()).data || []);
        if (certRes.ok) setCertificates((await certRes.json()).data || []);
        if (!enrollRes.ok && !certRes.ok) setError(true);
      } catch { setError(true); }
      finally { setLoading(false); }
    }
    load();
  }, [lang, router]);

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  if (loading) return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-white" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="container mx-auto py-10 px-4 text-center">
      <p className="text-[#7b8fa1]">{dict.common.error}</p>
    </div>
  );

  return (
    <div className="app-surface min-h-[calc(100vh-8rem)]">
    <div className="container mx-auto space-y-10 px-4 py-10">
      {/* My Courses */}
      <section>
        <div className="mb-8 rounded-lg border border-border bg-white p-6 shadow-sm">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Compass className="h-4 w-4" />
            {lang === "en" ? "Learning dashboard" : "Panel de aprendizaje"}
          </div>
          <h1 className="text-3xl font-bold">{dict.dashboard.myCourses}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{lang === "en" ? "Continue your learning journey and track progress toward certificates." : "Continúa tu aprendizaje y sigue el progreso hacia tus certificados."}</p>
        </div>
        {enrollments.length === 0 ? (
          <div className="grid gap-5 rounded-lg border border-dashed border-border bg-white p-6 md:grid-cols-[1fr_280px] md:items-center">
            <div>
              <BookOpen className="mb-4 h-11 w-11 text-primary" />
              <h2 className="text-xl font-semibold">
                {lang === "en" ? "No active courses yet" : "Todavía no tienes cursos activos"}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                {lang === "en"
                  ? "When you enroll in a MOOC, this panel will show your next lesson, completion progress, attempts, and certificates."
                  : "Cuando te matricules en un MOOC, este panel mostrará tu próxima lección, progreso, intentos y certificados."}
              </p>
              <Link href={`/${lang}/courses`} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b4967]">
                {dict.nav.courses}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                {lang === "en" ? "What appears here" : "Qué aparecerá aquí"}
              </div>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[t("Curso para continuar", "Course to continue"), t("Progreso por módulo", "Progress by module"), t("Certificados obtenidos", "Earned certificates")].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((e) => (
              <Link key={e.id} href={`/${lang}/courses/${e.course.slug}`} className="group flex flex-col overflow-hidden rounded-lg border border-border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary" />
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{t(e.course.title.es, e.course.title.en)}</h3>
                    {e.progress >= 100 && <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{dict.courses.progress}</span><span>{Math.round(e.progress)}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, e.progress)}%` }} /></div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{e.course._count.sessions} {t("sesiones", "sessions")}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{new Date(e.createdAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { dateStyle: "medium" })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* My Certificates */}
      <section>
        <h2 className="mb-2 text-2xl font-bold">{dict.dashboard.myCertificates}</h2>
        <p className="mb-6 text-muted-foreground">{lang === "en" ? "Your verifiable digital credentials." : "Tus credenciales digitales verificables."}</p>
        {certificates.length === 0 ? (
          <div className="rounded-lg border border-border bg-white px-5 py-10 text-center">
            <Award className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">{lang === "en" ? "No certificates yet." : "Aún no tienes certificados."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => <CertificateViewer key={cert.id} certificate={cert} lang={lang} />)}
          </div>
        )}
      </section>
    </div>
    </div>
  );
}
