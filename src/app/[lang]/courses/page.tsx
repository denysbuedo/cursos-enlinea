"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getDictionary, getLangFromParams } from "@/lib/i18n";
import { CourseCard } from "@/components/courses/CourseCard";
import { CourseFilters } from "@/components/courses/CourseFilters";

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
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">{dict.courses.allCourses}</h1>
      <p className="text-[#7b8fa1] mb-8">
        {lang === "en"
          ? "Browse our catalog of courses with verifiable certificates."
          : "Explora nuestro catálogo de cursos con certificados verificables."}
      </p>

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
            <div
              key={i}
              className="h-64 rounded-xl border bg-[#e8ecf1] animate-pulse"
            />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg text-[#7b8fa1]">{dict.common.noResults}</p>
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
              <span className="text-sm text-[#7b8fa1] px-4">
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
  );
}
