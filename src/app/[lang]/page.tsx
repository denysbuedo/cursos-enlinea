import { getLangFromParams } from "@/lib/i18n";
import { APP_NAME } from "@/lib/app-config";
import heroImage from "@/assets/mooc-hero-institucional.png";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  Layers3,
  PlayCircle,
} from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = getLangFromParams({ lang });
  const t = (es: string, en: string) => (locale === "en" ? en : es);

  const courseFlow = [
    {
      icon: Layers3,
      title: t("Módulos progresivos", "Progressive modules"),
      text: t(
        "Organiza cada MOOC en unidades breves con objetivos claros.",
        "Structure each MOOC into short units with clear goals.",
      ),
    },
    {
      icon: PlayCircle,
      title: t("Videos y recursos", "Videos and resources"),
      text: t(
        "Usa YouTube, repositorios externos o archivos subidos a la plataforma.",
        "Use YouTube, external repositories, or files uploaded to the platform.",
      ),
    },
    {
      icon: ClipboardCheck,
      title: t("Evaluación automática", "Automatic assessment"),
      text: t(
        "Banco de preguntas, intentos, retroalimentación y criterios de aprobación.",
        "Question bank, attempts, feedback, and passing criteria.",
      ),
    },
  ];

  return (
    <div className="app-surface">
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1.5 text-sm font-medium text-primary">
              <BookOpenCheck className="h-4 w-4" />
              {t("Plataforma MOOC en evolución", "MOOC platform in progress")}
            </div>
            <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              {APP_NAME}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {t(
                "Cursos en línea diseñados para aprendizaje autónomo, contenidos breves, evaluación automatizada y certificados verificables.",
                "Online courses designed for self-paced learning, short content, automated assessment, and verifiable certificates.",
              )}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/${locale}/courses`}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#084f85]"
              >
                {t("Explorar cursos", "Explore courses")}
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
            <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-white">
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

      <section className="container mx-auto px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {courseFlow.map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-white p-5">
              <item.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-white p-5">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{t("Analítica para operar", "Analytics for operations")}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t(
                "Seguimiento de matrículas, progreso, aprobación, intentos y certificados por edición.",
                "Track enrollments, progress, pass rates, attempts, and certificates by edition.",
              )}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-white p-5">
            <Award className="h-6 w-6 text-primary" />
            <h3 className="mt-4 font-semibold">{t("Credenciales verificables", "Verifiable credentials")}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t(
                "Certificados digitales con código de verificación y descarga en PDF.",
                "Digital certificates with verification code and PDF download.",
              )}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
