"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getDictionary, getLangFromParams } from "@/lib/i18n";
import { SessionList } from "@/components/sessions/SessionList";
import { EvaluationForm } from "@/components/evaluations/EvaluationForm";
import {
  BookOpen,
  Globe,
  Clock,
  CheckCircle2,
  Award,
  Download,
  Loader2,
  User,
  CalendarDays,
  Eye,
  Star,
} from "lucide-react";

interface CourseDetail {
  id: string;
  slug: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  coverImageUrl?: string | null;
  scienceBranch?: string | null;
  topics?: string[];
  keywords?: string[];
  learningObjectives?: { es?: string[]; en?: string[] } | null;
  targetAudience?: { es?: string[]; en?: string[] } | null;
  requirements?: { es?: string[]; en?: string[] } | null;
  competencies?: { es?: string[]; en?: string[] } | null;
  estimatedHours?: number | null;
  weeklyHours?: number | null;
  level?: string | null;
  language?: string | null;
  certificateAvailable?: boolean;
  selfPaced?: boolean;
  pricingModel: string;
  price?: number;
  currency: string;
  visibility: string;
  status: string;
  sessions: SessionItem[];
  modules?: ModuleItem[];
  editions?: CourseEditionItem[];
  isEnrolled: boolean;
  enrollmentStatus?: string | null;
  _count: { enrollments: number };
  viewCount?: number;
  uniqueVisitorCount?: number;
  completionCount?: number;
  instructor?: { name: string; bio?: string | null; institution?: string | null; avatarUrl?: string | null };
  instructors?: Array<{
    id: string;
    role: string;
    user: { name: string; bio?: string | null; institution?: string | null; avatarUrl?: string | null };
  }>;
  createdAt: string;
}

interface CourseEditionItem {
  id: string;
  name: { es: string; en: string };
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  isDefault: boolean;
}

interface ModuleItem {
  id: string;
  title: { es: string; en: string };
  description?: { es: string; en: string };
  order: number;
  status: string;
  sessions: SessionItem[];
}

interface SessionResource {
  id: string;
  title: string;
  url: string;
  type: string;
  source: "EXTERNAL" | "REPOSITORY" | "LOCAL_UPLOAD";
}

interface SessionItem {
  id: string;
  courseId: string;
  moduleId?: string | null;
  title: { es: string; en: string };
  description: { es: string; en: string };
  keywords: string[];
  sessionType: "RECORDED" | "LIVE" | "HYBRID";
  preview: boolean;
  videoUrl?: string;
  videoPlatform?: string;
  durationMinutes?: number | null;
  resources?: SessionResource[] | null;
  practicePrompt?: { es?: string; en?: string } | null;
  scheduledAt?: string;
  order: number;
  status: string;
}

interface EvaluationData {
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
}

const currencySymbol: Record<string, string> = {
  CUP: "CUP",
  USD: "$",
  EUR: "€",
};

function localizedList(value: { es?: string[]; en?: string[] } | null | undefined, lang: string) {
  const primary = lang === "en" ? value?.en : value?.es;
  const fallback = lang === "en" ? value?.es : value?.en;
  return Array.isArray(primary) && primary.length > 0 ? primary : Array.isArray(fallback) ? fallback : [];
}

interface CourseReviewItem {
  id: string;
  rating: number;
  testimonial?: string | null;
  createdAt: string;
  user: { name: string };
}

export default function CourseDetailPage() {
  const params = useParams<{ lang: string; slug: string }>();
  const lang = getLangFromParams(params);
  const dict = getDictionary(lang);
  const { slug } = params;

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [selectedEditionId, setSelectedEditionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedSessions, setCompletedSessions] = useState<string[]>([]);
  const [completingSession, setCompletingSession] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0 });
  const [reviews, setReviews] = useState<CourseReviewItem[]>([]);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTestimonial, setReviewTestimonial] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  // Evaluation state
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [loadingEval, setLoadingEval] = useState(false);
  const [noEvalAvailable, setNoEvalAvailable] = useState(false);
  const [evalResult, setEvalResult] = useState<{ score: number; passed: boolean } | null>(null);

  // Certificate state
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<{
    id: string; badgeId: string; verificationUrl: string; issuedAt: string;
  } | null>(null);
  const [issuingCert, setIssuingCert] = useState(false);

  const t = (es: string, en: string) => (lang === "en" ? en : es);

  useEffect(() => {
    async function fetchCourse() {
      setLoading(true);
      try {
        const res = await fetch(`/api/courses/${slug}`, { cache: "no-store" });
        if (!res.ok) { setError(true); return; }
        const data = await res.json();
        setCourse(data);
        void fetch(`/api/courses/${data.id}/view`, { method: "POST" });
        const reviewsRes = await fetch(`/api/courses/${data.id}/reviews`, { cache: "no-store" });
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData.data || []);
          setReviewSummary(reviewsData.summary || { average: 0, count: 0 });
        }
        const defaultEdition = data.editions?.find((edition: CourseEditionItem) => edition.isDefault) || data.editions?.[0];
        if (defaultEdition) setSelectedEditionId(defaultEdition.id);

        if (data.isEnrolled) {
          const enrollRes = await fetch("/api/enrollments/me");
          if (enrollRes.ok) {
            const enrollData = await enrollRes.json();
            const enrollment = enrollData.data?.find(
              (e: { course: { slug: string } }) => e.course.slug === slug
            );
            if (enrollment) {
              setProgress(enrollment.progress || 0);
              setEnrollmentId(enrollment.id);
              // Cargar sesiones ya completadas
              if (enrollment.completions) {
                setCompletedSessions(
                  enrollment.completions.map((c: { sessionId: string }) => c.sessionId)
                );
              }
              // Verificar si ya tiene certificado
              if (enrollment.certificate) {
                setCertificate(enrollment.certificate);
                setEvalResult({ score: 100, passed: true });
              }
            }
          }
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCourse();
  }, [slug]);

  const handleMarkComplete = async (sessionId: string) => {
    setCompletingSession(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/mark-complete`, { method: "POST" });
      if (res.status === 401) return;
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error");
      }
      const data = await res.json();
      setProgress(data.progress || 0);
      setCompletedSessions((prev) => [...prev, sessionId]);
    } catch (e) {
      console.error("Mark complete error:", e);
    } finally {
      setCompletingSession(null);
    }
  };

  const handleLoadEvaluation = async () => {
    setLoadingEval(true);
    try {
      const res = await fetch(`/api/evaluations?courseSlug=${slug}`);
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
      const data = await res.json();
      if (data.alreadyPassed) {
        setEvalResult({ score: data.bestScore, passed: true });
      }
      setEvaluation(data.data);
      setShowEvaluation(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("no tiene evaluación")) {
        setNoEvalAvailable(true);
      }
    } finally {
      setLoadingEval(false);
    }
  };

  const handleSubmitEvaluation = async (answers: { questionId: string; answer: string }[]) => {
    if (!evaluation) return;
    const res = await fetch(`/api/evaluations/${evaluation.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
    const data = await res.json();
    setEvalResult(data.data);
    return data.data;
  };

  const handleIssueCertificate = async () => {
    if (!enrollmentId) return;
    setIssuingCert(true);
    try {
      const res = await fetch(`/api/certificates/${enrollmentId}`, { method: "POST" });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error"); }
      const data = await res.json();
      setCertificate(data.data);
    } catch (e) {
      console.error("Issue certificate error:", e);
    } finally {
      setIssuingCert(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-4">
        <div className="h-8 w-64 bg-[#e8ecf1] animate-pulse rounded mb-4" />
        <div className="h-4 w-96 bg-[#e8ecf1] animate-pulse rounded mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-[#e8ecf1] animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h1 className="text-2xl font-bold text-black">
          {t("Curso no encontrado", "Course not found")}
        </h1>
        <Link href={`/${lang}/courses`} className="mt-4 inline-block text-primary hover:underline">
          ← {t("Volver al catálogo", "Back to catalog")}
        </Link>
      </div>
    );
  }

  const isFree = course.pricingModel === "FREE";
  const allComplete = progress >= 100;
  const moduleSessionCount = course.modules?.reduce((total, module) => total + module.sessions.length, 0) ?? 0;
  const standaloneSessions = course.modules && course.modules.length > 0
    ? course.sessions.filter((session) => !session.moduleId)
    : course.sessions;
  const totalSessions = moduleSessionCount + standaloneSessions.length;
  const checkoutHref = `/${lang}/checkout?course=${course.slug}${selectedEditionId ? `&edition=${selectedEditionId}` : ""}`;
  const objectives = localizedList(course.learningObjectives, lang);
  const audience = localizedList(course.targetAudience, lang);
  const requirements = localizedList(course.requirements, lang);
  const competencies = localizedList(course.competencies, lang);
  const selectedEdition = course.editions?.find((edition) => edition.id === selectedEditionId) || course.editions?.find((edition) => edition.isDefault) || course.editions?.[0];
  const courseStartLabel = selectedEdition?.startsAt
    ? new Date(selectedEdition.startsAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { dateStyle: "long" })
    : t("Inicio abierto", "Open start");
  const courseEndLabel = selectedEdition?.endsAt
    ? new Date(selectedEdition.endsAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", { dateStyle: "long" })
    : null;
  const publicInstructors = course.instructors?.length
    ? course.instructors.map((assignment) => ({ ...assignment.user, role: assignment.role }))
    : course.instructor
      ? [{ ...course.instructor, role: "LEAD" }]
      : [];
  const levelLabel: Record<string, string> = {
    BEGINNER: t("Principiante", "Beginner"),
    INTERMEDIATE: t("Intermedio", "Intermediate"),
    ADVANCED: t("Avanzado", "Advanced"),
  };

  const downloadOfflineCourse = async () => {
    try {
      const res = await fetch(`/api/courses/${course?.id || slug}/offline-package`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("No se pudo exportar el curso.", "Could not export the course."));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${course?.slug || slug}-offline.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Offline export error:", downloadError);
    }
  };

  const handleSubmitReview = async () => {
    if (!course || reviewRating < 1) return;
    setSavingReview(true);
    setReviewMessage("");
    try {
      const res = await fetch(`/api/courses/${course.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, testimonial: reviewTestimonial }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("No se pudo guardar la valoración.", "Could not save rating."));
      setReviewMessage(t("Gracias. Tu valoración quedó pendiente de moderación.", "Thanks. Your review is pending moderation."));
    } catch (e) {
      setReviewMessage(e instanceof Error ? e.message : t("No se pudo guardar la valoración.", "Could not save rating."));
    } finally {
      setSavingReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-sm text-[#7b8fa1] mb-6">
        <Link href={`/${lang}/courses`} className="hover:text-black">{dict.courses.allCourses}</Link>
        <span className="mx-2">/</span>
        <span className="text-black">{t(course.title.es, course.title.en)}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          {/* Title + badges */}
          <header className="border-b border-[#d8e1ea] pb-8">
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              {course.scienceBranch && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  {course.scienceBranch}
                </span>
              )}
              <span style={{background:isFree?"#d5f5e3":"#fef3c6", color:"#000"}} className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium">
                {isFree ? dict.courses.free : `${currencySymbol[course.currency] || ""}${course.price} ${course.currency}`}
              </span>
              {course.isEnrolled && (
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-3 py-1 text-sm font-medium">{dict.courses.enrolled}</span>
              )}
              {course.enrollmentStatus === "PENDING_PAYMENT" && (
                <span style={{background:"#fef3c6", color:"#000"}} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {t("Pendiente de aprobación", "Pending approval")}
                </span>
              )}
              {allComplete && (
                <span style={{background:"#d5f5e3", color:"#000"}} className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />{dict.dashboard.complete}
                </span>
              )}
            </div>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-[#17212b]">
              {t(course.title.es, course.title.en)}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-[#52667a]">
              {t(course.description.es, course.description.en)}
            </p>
            {((course.topics && course.topics.length > 0) || (course.keywords && course.keywords.length > 0)) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {[...(course.topics || []), ...(course.keywords || [])].slice(0, 8).map((item) => (
                  <span key={item} className="rounded-md border border-[#d8e1ea] bg-white px-2.5 py-1 text-xs font-medium text-[#52667a]">
                    {item}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-6 max-w-xl">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <CalendarDays className="h-4 w-4" />
                  {t("Inicio del curso", "Course start")}
                </p>
                <p className="mt-2 text-xl font-semibold text-[#17212b]">{courseStartLabel}</p>
                {courseEndLabel && (
                  <p className="mt-1 text-sm text-[#52667a]">
                    {t("Cierre", "Ends")}: {courseEndLabel}
                  </p>
                )}
              </div>
            </div>
          </header>

          <section>
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#d8e1ea] pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">MOOC</p>
                <h2 className="text-2xl font-semibold text-[#17212b]">{t("Ficha académica", "Academic profile")}</h2>
              </div>
            </div>
            <div className="grid gap-px overflow-hidden border border-[#d8e1ea] bg-[#d8e1ea] sm:grid-cols-2 lg:grid-cols-3">
              {course.estimatedHours && (
                <div className="bg-white p-4">
                  <p className="text-xs text-[#7b8fa1]">{t("Duración estimada", "Estimated duration")}</p>
                  <p className="font-medium">{course.estimatedHours} {t("horas", "hours")}</p>
                </div>
              )}
              {course.weeklyHours && (
                <div className="bg-white p-4">
                  <p className="text-xs text-[#7b8fa1]">{t("Esfuerzo semanal", "Weekly effort")}</p>
                  <p className="font-medium">{course.weeklyHours} {t("horas", "hours")}</p>
                </div>
              )}
              {course.level && (
                <div className="bg-white p-4">
                  <p className="text-xs text-[#7b8fa1]">{t("Nivel", "Level")}</p>
                  <p className="font-medium">{levelLabel[course.level] || course.level}</p>
                </div>
              )}
              <div className="bg-white p-4">
                <p className="text-xs text-[#7b8fa1]">{t("Ritmo", "Pace")}</p>
                <p className="font-medium">{course.selfPaced !== false ? t("Autodirigido", "Self-paced") : t("Por edición", "Cohort-based")}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-xs text-[#7b8fa1]">{t("Idioma", "Language")}</p>
                <p className="font-medium">{(course.language || "es").toUpperCase()}</p>
              </div>
              <div className="bg-white p-4">
                <p className="text-xs text-[#7b8fa1]">{t("Certificado", "Certificate")}</p>
                <p className="font-medium">{course.certificateAvailable !== false ? t("Disponible", "Available") : t("No disponible", "Not available")}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">
              {[
                { title: t("Qué aprenderás", "What you will learn"), items: objectives },
                { title: t("A quién va dirigido", "Who this is for"), items: audience },
                { title: t("Requisitos", "Requirements"), items: requirements },
                { title: t("Competencias", "Competencies"), items: competencies },
              ].filter((section) => section.items.length > 0).map((section) => (
                <div key={section.title}>
                  <h3 className="mb-3 border-b border-[#d8e1ea] pb-2 text-base font-semibold text-[#17212b]">{section.title}</h3>
                  <ul className="space-y-1 text-sm text-[#506478]">
                    {section.items.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Progress bar */}
          {course.isEnrolled && (
            <section className="border-y border-[#d8e1ea] py-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">{dict.courses.progress}</span>
                <span className="text-[#7b8fa1]">{Math.round(progress)}%</span>
              </div>
              <div className="h-3 rounded-full bg-[#e8ecf1] overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${Math.min(100, progress)}%` }} />
              </div>
              <button type="button" onClick={() => void downloadOfflineCourse()} className="mt-4 inline-flex items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5">
                <Download className="h-4 w-4" />
                {t("Descargar curso para uso offline", "Download course for offline use")}
              </button>
            </section>
          )}

          {/* Sessions */}
          <section>
            <div className="mb-6 border-b border-[#d8e1ea] pb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {t("Programa del curso", "Course program")}
              </p>
              <h2 className="text-2xl font-semibold text-[#17212b]">{dict.courses.sessions} ({totalSessions})</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52667a]">
                {t(
                  "Cada módulo organiza sus sesiones con video, actividad de práctica y bibliografía o materiales complementarios cuando estén disponibles.",
                  "Each module organizes its sessions with video, practice activity, and bibliography or complementary materials when available."
                )}
              </p>
            </div>
            {course.modules && course.modules.length > 0 ? (
              <div className="space-y-10">
                {standaloneSessions.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-lg font-semibold text-[#17212b]">{t("Sesiones sin módulo", "Sessions without module")}</h3>
                    <SessionList
                      sessions={standaloneSessions}
                      isEnrolled={course.isEnrolled}
                      lang={lang}
                      courseId={course.id}
                      onMarkComplete={course.isEnrolled ? handleMarkComplete : undefined}
                      completingSession={completingSession}
                    />
                  </section>
                )}
                {course.modules.map((module) => (
                  <section key={module.id} className="space-y-4">
                    <div className="border-l-4 border-primary pl-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8fa1]">
                        {t("Módulo", "Module")} {module.order}
                      </p>
                      <h3 className="text-xl font-semibold text-[#17212b]">
                        {t(module.title.es, module.title.en)}
                      </h3>
                      {module.description && (
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52667a]">
                          {t(module.description.es, module.description.en)}
                        </p>
                      )}
                    </div>
                    <SessionList
                      sessions={module.sessions}
                      isEnrolled={course.isEnrolled}
                      lang={lang}
                      courseId={course.id}
                      onMarkComplete={course.isEnrolled ? handleMarkComplete : undefined}
                      completingSession={completingSession}
                      completedSessions={completedSessions}
                    />
                  </section>
                ))}
              </div>
            ) : (
              <SessionList
                sessions={course.sessions}
                isEnrolled={course.isEnrolled}
                lang={lang}
                courseId={course.id}
                onMarkComplete={course.isEnrolled ? handleMarkComplete : undefined}
                completingSession={completingSession}
                completedSessions={completedSessions}
              />
            )}
          </section>

          <section className="rounded-xl border p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#17212b]">{t("Valoraciones del curso", "Course ratings")}</h2>
              <div className="flex items-center gap-2 text-sm text-[#52667a]">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                  <Star className="h-4 w-4 fill-current" /> {reviewSummary.average.toFixed(1)}
                </span>
                <span>({reviewSummary.count})</span>
              </div>
            </div>
            {reviews.length > 0 && (
              <div className="mt-5 space-y-4">
                {reviews.map((review) => (
                  <blockquote key={review.id} className="border-l-2 border-primary/30 pl-4">
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? "fill-current" : ""}`} />)}
                    </div>
                    {review.testimonial && <p className="mt-1 text-sm leading-6 text-[#52667a]">“{review.testimonial}”</p>}
                    <footer className="mt-1 text-xs text-[#7b8fa1]">{review.user.name}</footer>
                  </blockquote>
                ))}
              </div>
            )}
            {course.isEnrolled && (
              <div className="mt-6 border-t pt-5">
                <h3 className="text-sm font-semibold">{t("Comparte tu experiencia", "Share your experience")}</h3>
                <div className="mt-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    return <button key={value} type="button" onClick={() => setReviewRating(value)} aria-label={`${value} ${t("estrellas", "stars")}`} className="text-amber-500 hover:scale-110"><Star className={`h-6 w-6 ${value <= reviewRating ? "fill-current" : ""}`} /></button>;
                  })}
                </div>
                <textarea value={reviewTestimonial} onChange={(e) => setReviewTestimonial(e.target.value)} rows={3} maxLength={2000} placeholder={t("Comentario opcional", "Optional testimonial")} className="mt-3 w-full rounded-md border px-3 py-2 text-sm" />
                <button type="button" onClick={handleSubmitReview} disabled={savingReview || reviewRating < 1} className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                  {savingReview ? t("Guardando...", "Saving...") : t("Enviar valoración", "Submit rating")}
                </button>
                {reviewMessage && <p className="mt-2 text-sm text-[#52667a]">{reviewMessage}</p>}
              </div>
            )}
          </section>

          {/* Evaluation section */}
          {course.isEnrolled && allComplete && (
            <div className="rounded-xl border p-6 bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold">{dict.dashboard.elegible}</h3>
                  <p className="text-sm text-[#7b8fa1] mt-1 mb-4">
                    {course.certificateAvailable === false
                      ? t("Has completado todas las sesiones. Este curso no ofrece certificado.", "You have completed all sessions. This course does not offer a certificate.")
                      : t("Has completado todas las sesiones. Realiza la evaluación para obtener tu certificado.", "You have completed all sessions. Take the evaluation to earn your certificate.")}
                  </p>

                  {certificate ? (
                    // Certificado ya emitido
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-black font-medium">
                        <Award className="w-5 h-5" />
                        {t("¡Certificado emitido!", "Certificate issued!")}
                      </div>
                      <p className="text-sm text-[#7b8fa1]">
                        {t(`Badge ID: ${certificate.badgeId}`, `Badge ID: ${certificate.badgeId}`)}
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        <a href={`/api/certificates/${certificate.id}/pdf`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white text-sm font-medium hover:opacity-90">
                          {t("Descargar PDF", "Download PDF")}
                        </a>
                        <a href={`/${lang}/verify/${certificate.badgeId}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent">
                          {t("Verificar online", "Verify online")}
                        </a>
                      </div>
                    </div>
                  ) : evalResult?.passed && course.certificateAvailable !== false ? (
                    // Aprobó pero aún no tiene certificado
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-black font-medium">
                        <CheckCircle2 className="w-5 h-5" />
                        {t(`¡Aprobado con ${evalResult.score}%!`, `Passed with ${evalResult.score}%!`)}
                      </div>
                      <button onClick={handleIssueCertificate} disabled={issuingCert}
                        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
                        {issuingCert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        {t("Emitir certificado", "Issue certificate")}
                      </button>
                    </div>
                  ) : evalResult?.passed ? (
                    <div className="flex items-center gap-2 text-black font-medium">
                      <CheckCircle2 className="w-5 h-5" />
                      {t(`¡Aprobado con ${evalResult.score}%!`, `Passed with ${evalResult.score}%!`)}
                    </div>
                  ) : noEvalAvailable ? (
                    <div className="p-3 rounded-lg bg-[#e8ecf1] text-sm text-[#506478]">
                      {t("Este curso no tiene evaluación configurada. Contacta al instructor.", "This course has no evaluation configured. Contact the instructor.")}
                    </div>
                  ) : (
                    <button onClick={handleLoadEvaluation} disabled={loadingEval}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-white font-medium hover:bg-amber-600 transition-colors disabled:opacity-50">
                      {loadingEval ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                      {t("Realizar evaluación", "Take evaluation")}
                    </button>
                  )}
                </div>
              </div>

              {showEvaluation && evaluation && !evalResult?.passed && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-semibold mb-4">{t(evaluation.title.es, evaluation.title.en)}</h4>
                  <EvaluationForm evaluation={evaluation} lang={lang} onSubmit={handleSubmitEvaluation} />
                </div>
              )}

              {evalResult && !evalResult.passed && (
                <button onClick={() => { setShowEvaluation(true); setEvalResult(null); }}
                  className="mt-4 text-primary hover:underline text-sm">
                  {t("Intentar de nuevo", "Try again")}
                </button>
              )}
            </div>
          )}

          {/* Action button */}
          {!course.isEnrolled && course.enrollmentStatus !== "PENDING_PAYMENT" && course.editions && course.editions.length > 0 && (
            <section className="rounded-xl border p-5">
              <h2 className="text-lg font-semibold mb-3">{t("Selecciona edición", "Select edition")}</h2>
              <div className="space-y-2">
                {course.editions.map((edition) => (
                  <label key={edition.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm hover:bg-accent ${selectedEditionId === edition.id ? "border-primary bg-primary/5" : ""}`}>
                    <input
                      type="radio"
                      name="edition"
                      checked={selectedEditionId === edition.id}
                      onChange={() => setSelectedEditionId(edition.id)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block font-medium">
                        {t(edition.name.es, edition.name.en)}
                        {edition.isDefault && <span className="ml-2 text-xs text-primary">{t("por defecto", "default")}</span>}
                      </span>
                      <span className="text-xs text-[#7b8fa1]">
                        {edition.startsAt ? new Date(edition.startsAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES") : t("Inicio abierto", "Open start")}
                        {edition.endsAt ? ` - ${new Date(edition.endsAt).toLocaleDateString(lang === "en" ? "en-US" : "es-ES")}` : ""}
                        {edition.capacity ? ` · ${edition.capacity} ${t("cupos", "seats")}` : ""}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {!course.isEnrolled && course.enrollmentStatus !== "PENDING_PAYMENT" && (
            <div className="pt-4">
              <Link href={checkoutHref}
                className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-white font-medium hover:opacity-90 transition-opacity">
                {isFree ? t("Matricularme", "Enroll") : dict.courses.enroll}
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="rounded-xl border p-6 space-y-4">
            <h3 className="font-semibold">{t("Detalles del curso", "Course Details")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-[#7b8fa1]">
                <BookOpen className="w-4 h-4" />
                <span>{course._count?.enrollments || 0} {t("estudiantes", "students")}</span>
              </div>
              <div className="flex items-center gap-2 text-[#7b8fa1]">
                <Eye className="w-4 h-4" />
                <span>{course.viewCount || 0} {t("visitas", "views")}</span>
              </div>
              <div className="flex items-center gap-2 text-[#7b8fa1]">
                <CheckCircle2 className="w-4 h-4" />
                <span>{course.completionCount || 0} {t("completados", "completed")}</span>
              </div>
              <div className="flex items-center gap-2 text-[#7b8fa1]">
                <Globe className="w-4 h-4" />
                <span>{course.visibility === "PUBLIC" ? t("Público", "Public") : course.visibility}</span>
              </div>
              <div className="flex items-center gap-2 text-[#7b8fa1]">
                <CalendarDays className="w-4 h-4" />
                <span>{courseStartLabel}</span>
              </div>
              {publicInstructors[0] && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{publicInstructors.length === 1 ? publicInstructors[0].name : `${publicInstructors.length} ${t("instructores", "instructors")}`}</span>
                </div>
              )}
            </div>
          </div>
          {publicInstructors.length > 0 && publicInstructors.some((instructor) => instructor.bio || instructor.institution || instructor.avatarUrl) && (
            <section className="rounded-xl border p-6">
              <h3 className="font-semibold">{t("Conozca a sus instructores", "Meet your instructors")}</h3>
              <div className="mt-4 space-y-4">
                {publicInstructors.map((instructor) => (
                  <div key={`${instructor.name}-${instructor.role}`} className="flex items-start gap-3">
                    {instructor.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={instructor.avatarUrl} alt={instructor.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                        {instructor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-[#17212b]">{instructor.name}</p>
                      {instructor.institution && <p className="mt-0.5 text-xs text-[#7b8fa1]">{instructor.institution}</p>}
                      {instructor.bio && <p className="mt-2 text-sm leading-6 text-[#52667a]">{instructor.bio}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
