const EDITION_TIME_ZONE = "America/Havana";

function dateKeyInTimeZone(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: EDITION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "00";
  const day = parts.find((part) => part.type === "day")?.value || "00";
  return `${year}-${month}-${day}`;
}

export function editionDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function hasEditionStarted(startsAt: Date | null | undefined, now = new Date()) {
  return !startsAt || dateKeyInTimeZone(now) >= editionDateKey(startsAt);
}

export function formatEditionDate(value: string | null | undefined, locale: string, style: "long" | "short" = "long") {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: "UTC" }).format(new Date(value));
}
