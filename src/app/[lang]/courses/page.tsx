"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getDictionary, getLangFromParams } from "@/lib/i18n";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseFilters } from "@/components/courses/CourseFilters";
import { ArrowRight, BookOpenCheck, GraduationCap } from "lucide-react";
import Link from "next/link";

interface CourseData {
  id: string;
  slug: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  pricingModel: string;
  price?: number;
  currency: string;
  _count: { enrollments: number; sessions: number };
  sessions?: { id: string }[];
}

export default function CoursesPage() {
  const params = useParams<{ lang: string }>();
  const lang = getLangFromParams(params);
  const dict = getDictionary(lang);

  const [courses, setCourses] = useState<CourseData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [currency, setCurrency] = useState("");
  const [pricingModel, setPricingModel] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currency) params.set("currency", currency);
      if (pricingModel) params.set("pricingModel", pricingModel);
      if (search) params.set("search", search);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/courses?${params.toString()}`);
      const json = await res.json();
      setCourses(json.data || []);
      setTotal(json.total || 0);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [currency, pricingModel, search, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
  }, [fetchCourses]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="app-surface min-h-[calc(100vh-8rem)]">
      <div className="container mx-auto px-4 py-10">
      <div className="mb-8 rounded-lg border border-border bg-white p-6 shadow-sm">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <GraduationCap className="h-4 w-4" />
            {lang === "en" ? "MOOC catalog" : "Catálogo MOOC"}
          </div>
          <h1 className="text-3xl font-bold">{dict.courses.allCourses}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {lang === "en"
              ? "Browse self-paced courses with short lessons, automatic assessment, and verifiable certificates."
              : "Explora cursos autónomos con lecciones breves, evaluación automática y certificados verificables."}
          </p>
        </div>
      </div>

      <CourseFilters
        lang={lang}
        onSearch={setSearchInput}
        onCurrencyChange={(v) => {
          setCurrency(v);
          setPage(1);
        }}
        onPricingModelChange={(v) => {
          setPricingModel(v);
          setPage(1);
        }}
        selectedCurrency={currency}
        selectedPricingModel={pricingModel}
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-lg border border-border bg-white" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white px-5 py-14 text-center">
          <BookOpenCheck className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="text-xl font-semibold">
            {lang === "en" ? "No courses published yet" : "Aún no hay cursos publicados"}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {lang === "en"
              ? "The catalog is ready. Published MOOCs will appear here with their lessons, assessments, and certificates."
              : "El catálogo está listo. Los MOOCs publicados aparecerán aquí con sus lecciones, evaluaciones y certificados."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={`/${lang}`} className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b4967]">
              {lang === "en" ? "Back to home" : "Volver al inicio"}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={`/${lang}/dashboard`} className="focus-ring inline-flex items-center justify-center rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">
              {lang === "en" ? "Student dashboard" : "Panel del estudiante"}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                {...course}
                lang={lang}
                hasPreview={
                  course.sessions ? course.sessions.length > 0 : false
                }
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-accent transition-colors"
              >
                {lang === "en" ? "Previous" : "Anterior"}
              </button>
              <span className="px-4 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-40 hover:bg-accent transition-colors"
              >
                {lang === "en" ? "Next" : "Siguiente"}
              </button>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
