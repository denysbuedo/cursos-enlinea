import { getLangFromParams } from "@/lib/i18n";
import { APP_NAME } from "@/lib/app-config";
import { PLATFORM_ID } from "@/lib/platform-config";
import { prisma } from "@/lib/prisma";
import { CourseCard } from "@/components/courses/CourseCard";
import heroImage from "@/assets/mooc-hero-cuba.png";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  ClipboardCheck,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLangFromParams({ lang });
  const t = (es: string, en: string) => (locale === "en" ? en : es);
  const isNae = PLATFORM_ID === "nae";
  const useNaeReferenceStats = isNae && locale === "es";
  const featuredRows = await prisma.course.findMany({
    where: { status: "PUBLISHED", visibility: "PUBLIC" },
    include: {
      _count: { select: { enrollments: true, sessions: true } },
      editions: {
        where: { status: "PUBLISHED" },
        select: { startsAt: true, endsAt: true },
        orderBy: [{ isDefault: "desc" }, { startsAt: "asc" }, { createdAt: "asc" }],
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: isNae ? 3 : 4,
  });
  const featuredCourses = featuredRows.map((course) => ({
    id: course.id,
    slug: course.slug,
    title: course.title as { es: string; en: string },
    description: course.description as { es: string; en: string },
    coverImageUrl: course.coverImageUrl,
    scienceBranch: course.scienceBranch,
    pricingModel: course.pricingModel,
    price: course.price ? Number(course.price) : undefined,
    currency: course.currency,
    _count: course._count,
    editions: course.editions.map((edition) => ({
      startsAt: edition.startsAt?.toISOString() || null,
      endsAt: edition.endsAt?.toISOString() || null,
    })),
  }));

  const [publishedCourses, enrolledStudents, issuedCertificates, instructors] = await Promise.all([
    prisma.course.count({ where: { status: "PUBLISHED", visibility: "PUBLIC" } }),
    prisma.enrollment.findMany({ where: { status: "ACTIVE" }, select: { userId: true }, distinct: ["userId"] }),
    prisma.certificate.count({ where: { isRevoked: false } }),
    prisma.user.count({ where: { role: "INSTRUCTOR" } }),
  ]);
  const platformStats = [
    { value: publishedCourses, label: t("cursos publicados", "published courses"), icon: BookOpenCheck },
    { value: enrolledStudents.length, label: t("estudiantes matriculados", "enrolled students"), icon: GraduationCap },
    { value: issuedCertificates, label: t("certificados emitidos", "certificates issued"), icon: Award },
    { value: instructors, label: t("profesores", "instructors"), icon: ClipboardCheck },
  ];
  const studentBenefits = [
    {
      icon: GraduationCap,
      tone: "bg-[#e8f1f7]",
      title: t("Aprende a tu ritmo", "Learn at your own pace"),
      text: t(
        "Avanza desde cualquier lugar y organiza tu estudio según tu tiempo disponible.",
        "Learn from anywhere and organize your study around your available time.",
      ),
    },
    {
      icon: BookOpenCheck,
      tone: "bg-[#f0f3f5]",
      title: t("Contenidos organizados", "Structured content"),
      text: t(
        "Encuentra lecciones breves, videos y materiales complementarios en un solo lugar.",
        "Find short lessons, videos, and complementary materials in one place.",
      ),
    },
    {
      icon: ClipboardCheck,
      tone: "bg-[#eaf4ef]",
      title: t("Evalúa y certifica tu avance", "Assess and certify your progress"),
      text: t(
        "Recibe retroalimentación inmediata y obtén un certificado digital verificable al completar el curso.",
        "Get immediate feedback and earn a verifiable digital certificate when you complete the course.",
      ),
    },
  ];
  return (
    <div className={isNae ? "nae-home" : "app-surface"}>
      {isNae ? (
        <section className="nae-hero">
          <div className="nae-hero-reference" aria-hidden="true">
            <picture>
              <source media="(max-width: 640px)" srcSet="/nae-home-mobile.svg" />
              <img src="/nae-home-desktop.svg" alt="" />
            </picture>
          </div>
          <h1 className="sr-only">{t("Fortalecimiento de capacidades para nuevos actores económicos", "Capacity building for new economic actors")}</h1>
          <Link
            href={`/${locale}/courses`}
            className="nae-hero-hotspot nae-hero-hotspot-catalog"
            aria-label={t("Ver catálogo de cursos", "View course catalog")}
          />
          <Link
            href={`/${locale}/dashboard`}
            className="nae-hero-hotspot nae-hero-hotspot-dashboard"
            aria-label={t("Ir a mi panel", "Go to my dashboard")}
          />
        </section>
      ) : (
        <section className="container mx-auto px-4 py-8 lg:py-9">
        <div className="grid items-center gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-sm font-medium text-primary">
              <BookOpenCheck className="h-4 w-4" />
              {t("Cursos en línea", "Online courses")}
            </div>
            <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-[3.35rem]">
              {APP_NAME}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t(
                isNae
                  ? "Fortalece tus capacidades para crear, gestionar y hacer crecer iniciativas de nuevos actores económicos."
                  : "Cursos en línea diseñados para aprendizaje autónomo, contenidos breves, evaluación automatizada y certificados verificables.",
                isNae
                  ? "Strengthen your skills to create, manage, and grow initiatives led by new economic actors."
                  : "Online courses designed for self-paced learning, short content, automated assessment, and verifiable certificates.",
              )}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {[
                t("Aprendizaje autónomo", "Self-paced learning"),
                t("Evaluación automática", "Automatic assessment"),
                t("Certificación digital", "Digital certification"),
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${locale}/courses`}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#084f85]"
              >
                {t("Ver catálogo de cursos", "View course catalog")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/${locale}/dashboard`}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
              >
                {t("Ir a mi panel", "Go to my dashboard")}
              </Link>
            </div>
          </div>

          <div className="visual-panel overflow-hidden rounded-lg p-3">
            <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-white">
              <Image
                src={heroImage}
                alt={t(
                  "Ambiente universitario moderno con aprendizaje en línea",
                  "Modern university setting with online learning",
                )}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 1024px) 44vw, 100vw"
              />
              <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary shadow-sm">
                MOOC
              </span>
            </div>
          </div>
        </div>
        </section>
      )}

      {useNaeReferenceStats ? (
        <section className="nae-stats-reference" aria-label={t("Indicadores de la plataforma", "Platform statistics")}>
          <div className="nae-stats-reference-art" aria-hidden="true">
            <picture>
              <source media="(max-width: 640px)" srcSet="/nae-home-mobile.svg" />
              <img src="/nae-home-desktop.svg" alt="" />
            </picture>
          </div>
          <div className="nae-stats-reference-values">
            {platformStats.map((stat) => (
              <div key={stat.label} className="nae-stats-reference-value">
                <span>{stat.value.toLocaleString("es-ES")}</span>
                <span className="sr-only">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className={`${isNae ? "nae-stat-band" : "border-y border-[#c5d9e7] bg-[#e8f1f7]"}`} aria-label={t("Indicadores de la plataforma", "Platform statistics")}>
          <div className={`${isNae ? "nae-stat-grid" : "container mx-auto grid grid-cols-2 divide-x divide-y divide-[#c5d9e7] px-4 sm:grid-cols-4 sm:divide-y-0"}`}>
            {platformStats.map((stat) => (
              <div key={stat.label} className={`${isNae ? "nae-stat-item" : "flex min-h-28 items-center gap-3 px-3 py-4 sm:px-5 lg:px-7"}`}>
                <div className={`${isNae ? "nae-stat-icon" : "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm"}`}>
                  <stat.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <p className={`${isNae ? "nae-stat-value" : "text-3xl font-bold leading-none text-primary lg:text-4xl"}`}>{stat.value.toLocaleString(locale === "en" ? "en-US" : "es-ES")}</p>
                  <p className={`${isNae ? "nae-stat-label" : "mt-1 text-xs font-semibold leading-4 text-[#29445a]"}`}>{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(featuredCourses.length > 0 || isNae) && (
        <section className={`${isNae ? "nae-featured" : "border-y border-border bg-white"}`}>
          <div className={isNae ? "nae-featured-inner" : "container mx-auto px-4 py-12 lg:py-14"}>
            <div className={isNae ? "nae-featured-heading" : "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"}>
              <div>
                <p className={isNae ? "nae-featured-label" : "text-sm font-semibold uppercase tracking-[0.14em] text-primary"}>
                  {t("Oferta académica", "Academic offer")}
                </p>
                <h2 className={isNae ? "nae-featured-title" : "mt-2 text-2xl font-bold text-foreground sm:text-3xl"}>
                  {t("Cursos destacados", "Featured courses")}
                </h2>
              </div>
              <Link
                href={`/${locale}/courses`}
                className={isNae ? "nae-featured-link focus-ring" : "focus-ring inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"}
              >
                {t(isNae ? "Ver todos" : "Ver todo el catálogo", isNae ? "View all" : "View full catalog")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {featuredCourses.length > 0 ? (
              <div className={`grid grid-cols-1 gap-5 md:grid-cols-2 ${isNae ? "nae-featured-grid xl:grid-cols-3" : "xl:grid-cols-4"}`}>
                {featuredCourses.map((course) => (
                  <CourseCard key={course.id} {...course} lang={locale} />
                ))}
              </div>
            ) : (
              <div className="nae-featured-empty">
                {t("Aún no hay cursos destacados publicados.", "There are no featured courses published yet.")}
              </div>
            )}
          </div>
        </section>
      )}

      {isNae && (
        <section className="nae-benefits">
          <div className="nae-benefits-grid">
            {studentBenefits.map((item, index) => (
              <article key={item.title} className={`nae-benefit-card nae-benefit-card-${index + 1}`}>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {!isNae && <section className="container mx-auto px-4 py-14 lg:py-16">
        <div className={isNae ? "container mx-auto" : ""}>
        <div className="grid gap-4 md:grid-cols-3">
          {studentBenefits.map((item) => (
            <div key={item.title} className={`${item.tone} border-t-2 border-primary p-6`}>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
                <item.icon className="h-8 w-8" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        </div>
      </section>}
    </div>
  );
}
