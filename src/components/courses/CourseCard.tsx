"use client";
import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";

interface CourseEditionSummary {
  startsAt?: string | null;
  endsAt?: string | null;
}

interface CourseCardProps {
  id: string;
  slug: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  coverImageUrl?: string | null;
  scienceBranch?: string | null;
  topics?: string[];
  keywords?: string[];
  pricingModel: string;
  price?: number;
  currency: string;
  lang: string;
  _count?: { enrollments: number; sessions: number };
  editions?: CourseEditionSummary[];
}

const cs:Record<string,string>={CUP:"CUP",USD:"$",EUR:"€"};

function formatDate(value: string | null | undefined, lang: string) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(lang === "en" ? "en-US" : "es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CourseCard({slug,title,description,coverImageUrl,scienceBranch,pricingModel,price,currency,lang,_count,editions}:CourseCardProps){
  const t=(es:string,en:string)=>(lang==="en"?en:es);
  const isFree=pricingModel==="FREE";
  const primaryEdition = editions?.[0];
  const startLabel = formatDate(primaryEdition?.startsAt, lang);
  return (
    <Link
      href={`/${lang}/courses/${slug}`}
      className="group flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-[#edf2f5]">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={t(title.es, title.en)}
            className="h-full w-full object-contain p-2 transition-opacity duration-200 group-hover:opacity-95 sm:p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#edf2f5]">
            <span className="text-sm font-semibold text-primary/70">MOOC</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
          {scienceBranch && (
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {scienceBranch}
            </span>
          )}
          <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${isFree ? "bg-accent text-primary" : "bg-muted text-slate-700"}`}>
            {isFree?t("Gratuito","Free"):`${cs[currency]||""}${price} ${currency}`}
          </span>
        </div>
        <h3 className="mb-1 text-[15px] font-semibold leading-tight transition-colors group-hover:text-primary">{t(title.es,title.en)}</h3>
        <p className="mb-2 line-clamp-2 flex-1 text-xs leading-4.5 text-muted-foreground">{t(description.es,description.en)}</p>
        <div className="mb-2 rounded-md border border-border bg-[#f4f7fb] px-2 py-1 text-[11px]">
          <span className="inline-flex items-center gap-2 font-medium text-[#17212b]">
            <CalendarDays className="h-3 w-3 text-primary" />
            {startLabel ? `${t("Inicio", "Starts")}: ${startLabel}` : t("Inicio abierto", "Open start")}
          </span>
        </div>
        <div className="flex items-center gap-2 border-t border-border pt-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3"/>{_count?.enrollments||0} {t("alumnos","students")}</span>
        </div>
      </div>
    </Link>
  );
}
