import es from "@/messages/es.json";
import en from "@/messages/en.json";

type Messages = typeof es;
type Locale = "es" | "en";

const dictionaries: Record<Locale, Messages> = { es, en };

export function getDictionary(locale: Locale): Messages {
  return dictionaries[locale] || dictionaries.es;
}

export function getLangFromParams(params: { lang?: string }): Locale {
  const lang = params.lang || "es";
  return (lang === "en" ? "en" : "es") as Locale;
}

export function t(
  dict: Messages,
  key: string
): string {
  const keys = key.split(".");
  let value: unknown = dict;
  for (const k of keys) {
    if (typeof value === "object" && value !== null && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  return typeof value === "string" ? value : key;
}
