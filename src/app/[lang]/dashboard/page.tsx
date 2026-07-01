"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDictionary, getLangFromParams } from "@/lib/i18n";
import { BookOpen, Award, Clock, ArrowRight } from "lucide-react";
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
    <div className="container mx-auto py-10 px-4">
      <div className="h-8 w-48 bg-[#e8ecf1] animate-pulse rounded mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 bg-[#e8ecf1] animate-pulse rounded-xl" />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="container mx-auto py-10 px-4 text-center">
      <p className="text-[#7b8fa1]">{dict.common.error}</p>
    </div>
  );

  return (
    <div className="container mx-auto py-10 px-4 space-y-12">
      {/* My Courses */}
      <section>
        <h1 className="text-3xl font-bold mb-2">{dict.dashboard.myCourses}</h1>
        <p className="text-[#7b8fa1] mb-8">{lang === "en" ? "Continue your learning journey." : "Continúa tu viaje de aprendizaje."}</p>
        {enrollments.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto text-[#7b8fa1] mb-4" />
            <p className="text-lg text-[#7b8fa1] mb-4">{lang === "en" ? "You are not enrolled in any course yet." : "Aún no estás matriculado en ningún curso."}</p>
            <Link href={`/${lang}/courses`} className="inline-flex items-center gap-2 text-primary hover:underline font-medium">{dict.nav.courses}<ArrowRight className="w-4 h-4" /></Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enrollments.map((e) => (
              <Link key={e.id} href={`/${lang}/courses/${e.course.slug}`} className="group flex flex-col rounded-xl border bg-white hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary" />
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{t(e.course.title.es, e.course.title.en)}</h3>
                    {e.progress >= 100 && <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />}
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-[#7b8fa1]"><span>{dict.courses.progress}</span><span>{Math.round(e.progress)}%</span></div>
                    <div className="h-2 rounded-full bg-[#e8ecf1] overflow-hidden"><div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, e.progress)}%` }} /></div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-[#7b8fa1]">
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
        <h2 className="text-2xl font-bold mb-2">{dict.dashboard.myCertificates}</h2>
        <p className="text-[#7b8fa1] mb-6">{lang === "en" ? "Your verifiable digital credentials." : "Tus credenciales digitales verificables."}</p>
        {certificates.length === 0 ? (
          <div className="text-center py-10 border rounded-xl">
            <Award className="w-10 h-10 mx-auto text-[#7b8fa1] mb-3" />
            <p className="text-[#7b8fa1]">{lang === "en" ? "No certificates yet." : "Aún no tienes certificados."}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => <CertificateViewer key={cert.id} certificate={cert} lang={lang} />)}
          </div>
        )}
      </section>
    </div>
  );
}
