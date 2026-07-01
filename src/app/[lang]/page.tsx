import { getLangFromParams, getDictionary } from "@/lib/i18n";
import Link from "next/link";
import { GraduationCap, ShieldCheck, Globe, Award, ArrowRight } from "lucide-react";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = getLangFromParams({ lang });
  const dict = getDictionary(locale);
  const t = (es: string, en: string) => (locale === "en" ? en : es);

  return (
    <>
      <section className="relative bg-gradient-to-br from-[#0a3d62] via-[#135d8a] to-[#1a5276] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10"><div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white blur-3xl" /><div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-300 blur-3xl" /></div>
        <div className="relative container mx-auto px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-sm text-blue-100 mb-8"><Award className="w-4 h-4" />{t("Plataforma Educativa con Certificados Digitales Verificables","Educational Platform with Verifiable Digital Certificates")}</div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">{t("Cursos Online con","Online Courses with")}<br /><span className="bg-gradient-to-r from-blue-200 via-white to-blue-200 bg-clip-text text-transparent">{t("Certificados Verificables","Verifiable Certificates")}</span></h1>
          <p className="mt-6 text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed">{t("Obtén credenciales digitales con reconocimiento internacional respaldadas por Open Badges 3.0 y W3C Verifiable Credentials, con firma criptográfica EdDSA.","Earn internationally recognized digital credentials backed by Open Badges 3.0 and W3C Verifiable Credentials with EdDSA signing.")}</p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${lang}/courses`} className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-[#0a3d62] font-semibold hover:bg-blue-50 transition-all shadow-lg">{dict.nav.courses}<ArrowRight className="w-5 h-5" /></Link>
            <Link href={`/${lang}/register`} className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-8 py-4 text-white font-semibold hover:bg-white/10 transition-all">{dict.nav.register}</Link>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[{v:"3",l:t("Cursos","Courses")},{v:"OB 3.0",l:t("Estándar","Standard")},{v:"EdDSA",l:t("Firma","Signature")}].map(s=><div key={s.l} className="flex flex-col items-center p-4 rounded-xl bg-white/5 backdrop-blur"><span className="text-2xl font-bold text-blue-200">{s.v}</span><span className="text-xs text-blue-200/70 mt-1">{s.l}</span></div>)}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0"><svg viewBox="0 0 1440 80" fill="none" className="w-full h-auto"><path d="M0 40C240 80 480 0 720 40C960 80 1200 0 1440 40V80H0V40Z" fill="var(--background, #f8f9fa)"/></svg></div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 text-center mb-16"><h2 className="text-3xl font-bold text-foreground">{t("¿Por qué elegir EdPlatform?","Why choose EdPlatform?")}</h2></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto px-4">
          {[{icon:GraduationCap,title:t("Cursos Bilingües","Bilingual Courses"),desc:t("Contenido en español e inglés con sesiones grabadas, en vivo e híbridas.","Content in Spanish and English with recorded, live, and hybrid sessions.")},{icon:ShieldCheck,title:t("Certificados Verificables","Verifiable Certificates"),desc:t("Open Badges 3.0 con firma criptográfica EdDSA.","Open Badges 3.0 with EdDSA cryptographic signature.")},{icon:Globe,title:t("Pagos Georresistentes","Geo-Resistant Payments"),desc:t("Múltiples métodos de pago para contextos con restricciones.","Multiple payment methods for restricted contexts.")}].map(f=><div key={f.title} className="flex flex-col items-center text-center p-8 rounded-2xl bg-card border border-border hover:shadow-lg transition-all duration-300"><div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-5"><f.icon className="w-6 h-6" /></div><h3 className="text-lg font-semibold mb-3">{f.title}</h3><p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p></div>)}
        </div>
      </section>

      <section className="py-16"><div className="container mx-auto px-4 max-w-2xl text-center rounded-2xl bg-gradient-to-br from-[#0a3d62] to-[#135d8a] p-12 text-white shadow-xl"><h3 className="text-2xl font-bold mb-4">{t("Comienza tu viaje","Start your journey")}</h3><p className="text-blue-100 mb-8">{t("Regístrate gratis y obtén certificados verificables.","Sign up free and get verifiable certificates.")}</p><Link href={`/${lang}/courses`} className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-[#0a3d62] font-semibold hover:bg-blue-50 transition-all">{t("Explorar Cursos","Explore Courses")}<ArrowRight className="w-5 h-5" /></Link></div></section>
    </>
  );
}
