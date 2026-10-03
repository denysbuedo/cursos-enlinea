export type PlatformId = "reduniv" | "nae";

type LocalizedText = {
  es: string;
  en: string;
};

type PlatformTheme = {
  primary: string;
  primaryHover: string;
  accent: string;
  background: string;
  secondary: string;
  highlight: string;
};

type PlatformPreset = {
  displayName: string;
  shortName: string;
  description: LocalizedText;
  institutionalSupport: LocalizedText;
  theme: PlatformTheme;
};

const sharedTheme: PlatformTheme = {
  primary: "#0b5f9e",
  primaryHover: "#084f85",
  accent: "#e9f2f8",
  background: "#f6f8fa",
  secondary: "#0b5f9e",
  highlight: "#e9f2f8",
};

const presets: Record<PlatformId, PlatformPreset> = {
  reduniv: {
    displayName: "Aprendizaje Digital",
    shortName: "Reduniv",
    description: {
      es: "Plataforma de aprendizaje digital con cursos, evaluaciones y certificados verificables.",
      en: "Digital learning platform with courses, evaluations, and verifiable certificates.",
    },
    institutionalSupport: {
      es: "Esta plataforma está soportada por la Red Nacional de Investigación y Educación de Avanzada (Reduniv) del Ministerio de Educación Superior de la República de Cuba.",
      en: "This platform is supported by the National Advanced Research and Education Network (Reduniv) of the Ministry of Higher Education of the Republic of Cuba.",
    },
    theme: sharedTheme,
  },
  nae: {
    displayName: "Nuevos actores económicos",
    shortName: "NAE",
    description: {
      es: "Plataforma de formación para el fortalecimiento de capacidades e impulso de nuevos actores económicos.",
      en: "Learning platform for capacity building and the development of new economic actors.",
    },
    institutionalSupport: {
      es: "Programa de fortalecimiento de capacidades e impulso de nuevos actores económicos.",
      en: "Capacity-building and new economic actors development programme.",
    },
    theme: {
      primary: "#002b44",
      primaryHover: "#004d6a",
      accent: "#e5f8f4",
      background: "#f4f8fa",
      secondary: "#00b6a1",
      highlight: "#f0bf43",
    },
  },
};

function resolvePlatformId(value: string | undefined): PlatformId {
  return value?.trim().toLowerCase() === "nae" ? "nae" : "reduniv";
}

export const PLATFORM_ID = resolvePlatformId(process.env.NEXT_PUBLIC_PLATFORM_ID);
const preset = presets[PLATFORM_ID];
const configuredName = process.env.NEXT_PUBLIC_APP_NAME?.trim();

export const PLATFORM_CONFIG: PlatformPreset = {
  ...preset,
  displayName: configuredName || preset.displayName,
};
