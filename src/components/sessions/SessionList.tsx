"use client";

import {
  Play,
  Lock,
  Video,
  Radio,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";

interface SessionResource {
  id: string;
  title: string;
  url: string;
  type: string;
  source: "EXTERNAL" | "REPOSITORY" | "LOCAL_UPLOAD";
}

interface SessionItem {
  id: string;
  title: { es: string; en: string };
  description: { es: string; en: string };
  sessionType: "RECORDED" | "LIVE" | "HYBRID";
  preview: boolean;
  videoPlatform?: string;
  durationMinutes?: number | null;
  resources?: SessionResource[] | null;
  practicePrompt?: { es?: string; en?: string } | null;
  scheduledAt?: string;
  order: number;
  status: string;
}

interface SessionListProps {
  sessions: SessionItem[];
  isEnrolled: boolean;
  lang: string;
  courseId: string;
  onMarkComplete?: (sessionId: string) => void;
  completingSession?: string | null;
  completedSessions?: string[];
}

const sessionIcons: Record<string, React.ElementType> = {
  RECORDED: Video,
  LIVE: Radio,
  HYBRID: Calendar,
};

const sessionLabels: Record<string, { es: string; en: string }> = {
  RECORDED: { es: "Grabada", en: "Recorded" },
  LIVE: { es: "En vivo", en: "Live" },
  HYBRID: { es: "Híbrida", en: "Hybrid" },
};

export function SessionList({
  sessions,
  isEnrolled,
  lang,
  onMarkComplete,
  completingSession,
  completedSessions,
}: SessionListProps) {
  const t = (es: string, en: string) => (lang === "en" ? en : es);

  if (sessions.length === 0) {
    return (
      <p className="text-[#7b8fa1] text-center py-8">
        {t(
          "No hay sesiones disponibles para este curso.",
          "No sessions available for this course."
        )}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const Icon = sessionIcons[session.sessionType] || Video;
        const isLocked = !isEnrolled && !session.preview;
        const isCompleted = completedSessions?.includes(session.id);
        const isCompleting = completingSession === session.id;
        const practicePrompt = lang === "en"
          ? session.practicePrompt?.en || session.practicePrompt?.es
          : session.practicePrompt?.es || session.practicePrompt?.en;
        const resources = Array.isArray(session.resources) ? session.resources : [];

        return (
          <div
            key={session.id}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
              isLocked
                ? "opacity-60 bg-[#e8ecf1]/30"
                : isCompleted
                ? "bg-[#f0fdf4] dark:bg-green-950/20 border-[#b9f8cf] dark:border-green-900"
                : "hover:bg-accent/50"
            }`}
          >
            {/* Session number + icon */}
            <div
              className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${
                isCompleted
                  ? "bg-[#d5f5e3] text-black dark:bg-green-900/30 dark:text-green-400"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <span className="text-sm font-bold">{session.order}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-medium text-sm">
                  {t(session.title.es, session.title.en)}
                </h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e8ecf1] px-2 py-0.5 text-xs text-[#7b8fa1]">
                  <Icon className="w-3 h-3" />
                  {t(
                    sessionLabels[session.sessionType].es,
                    sessionLabels[session.sessionType].en
                  )}
                </span>
                {session.preview && !isEnrolled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d6eaf8] text-black dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 text-xs font-medium">
                    <Play className="w-3 h-3" />
                    {t("Preview gratuito", "Free preview")}
                  </span>
                )}
                {session.durationMinutes && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#eef2f6] px-2 py-0.5 text-xs text-[#52667a]">
                    <Clock className="w-3 h-3" />
                    {session.durationMinutes} {t("min", "min")}
                  </span>
                )}
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#d5f5e3] text-black dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {t("Completada", "Completed")}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#7b8fa1] mt-1 line-clamp-1">
                {t(session.description.es, session.description.en)}
              </p>
              {session.videoPlatform && (
                <p className="text-xs text-[#7b8fa1] mt-1">
                  {session.videoPlatform}
                </p>
              )}
              {session.scheduledAt && (
                <p className="text-xs text-[#7b8fa1] mt-1">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {new Date(session.scheduledAt).toLocaleDateString(
                    lang === "en" ? "en-US" : "es-ES",
                    { dateStyle: "medium", timeStyle: "short" }
                  )}
                </p>
              )}
              {!isLocked && practicePrompt && (
                <p className="text-xs text-[#52667a] mt-2 rounded-md bg-[#f7f9fb] px-3 py-2">
                  <span className="font-medium">{t("Práctica:", "Practice:")}</span> {practicePrompt}
                </p>
              )}
              {!isLocked && resources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {resources.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-accent"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{resource.title}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Action / Status */}
            <div className="flex-shrink-0">
              {isLocked ? (
                <Lock className="w-5 h-5 text-[#7b8fa1]" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-black" />
              ) : isEnrolled && onMarkComplete ? (
                <button
                  onClick={() => onMarkComplete(session.id)}
                  disabled={isCompleting}
                  className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                >
                  {isCompleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  {t("Completar", "Complete")}
                </button>
              ) : session.preview ? (
                <Play className="w-5 h-5 text-[#3b82f6]" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-primary" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
