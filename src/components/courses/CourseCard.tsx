"use client";
import Link from "next/link";
import { BookOpen, Play, Users } from "lucide-react";

interface CourseCardProps { id:string; slug:string; title:{es:string;en:string}; description:{es:string;en:string}; pricingModel:string; price?:number; currency:string; lang:string; _count?:{enrollments:number;sessions:number}; hasPreview?:boolean; }
const cs:Record<string,string>={CUP:"CUP",USD:"$",EUR:"€"};

export function CourseCard({slug,title,description,pricingModel,price,currency,lang,_count,hasPreview}:CourseCardProps){
  const t=(es:string,en:string)=>(lang==="en"?en:es);
  const isFree=pricingModel==="FREE";
  return (
    <Link
      href={`/${lang}/courses/${slug}`}
      className="group flex min-h-72 flex-col overflow-hidden rounded-lg border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="h-1.5 bg-primary" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${isFree ? "bg-accent text-primary" : "bg-muted text-slate-700"}`}>
            {isFree?t("Gratuito","Free"):`${cs[currency]||""}${price} ${currency}`}
          </span>
          {hasPreview&&<span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary"><Play className="w-3 h-3"/>{t("Vista previa","Preview")}</span>}
        </div>
        <h3 className="mb-2 text-lg font-semibold leading-tight transition-colors group-hover:text-primary">{t(title.es,title.en)}</h3>
        <p className="mb-5 line-clamp-3 flex-1 text-sm leading-6 text-muted-foreground">{t(description.es,description.en)}</p>
        <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5"/>{_count?.sessions||0} {t("sesiones","sessions")}</span>
          <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5"/>{_count?.enrollments||0} {t("alumnos","students")}</span>
        </div>
      </div>
    </Link>
  );
}
