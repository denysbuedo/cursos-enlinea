"use client";
import Link from "next/link";
import { BookOpen, Users, Play } from "lucide-react";

interface CourseCardProps { id:string; slug:string; title:{es:string;en:string}; description:{es:string;en:string}; pricingModel:string; price?:number; currency:string; lang:string; _count?:{enrollments:number;sessions:number}; hasPreview?:boolean; }
const cs:Record<string,string>={CUP:"CUP",USD:"$",EUR:"€"};

export function CourseCard({slug,title,description,pricingModel,price,currency,lang,_count,hasPreview}:CourseCardProps){
  const t=(es:string,en:string)=>(lang==="en"?en:es);
  const isFree=pricingModel==="FREE";
  return (
    <Link href={`/${lang}/courses/${slug}`} className="group flex flex-col rounded-xl border bg-card hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-2 mb-3">
          <span style={{background:isFree?"#d5f5e3":"#fef3c6",color:"#000"}} className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">{isFree?t("Gratuito","Free"):`${cs[currency]||""}${price} ${currency}`}</span>
          {hasPreview&&<span style={{background:"#d6eaf8",color:"#1e40af"}} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"><Play className="w-3 h-3"/>{t("Vista previa","Preview")}</span>}
        </div>
        <h3 className="text-lg font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">{t(title.es,title.en)}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{t(description.es,description.en)}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-4 border-t">
          <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5"/>{_count?.sessions||0} {t("sesiones","sessions")}</span>
          <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5"/>{_count?.enrollments||0} {t("alumnos","students")}</span>
        </div>
      </div>
    </Link>
  );
}
