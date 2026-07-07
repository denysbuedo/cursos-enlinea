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
  Library,
  Loader2,
  MonitorPlay,
  PencilLine,
} from "lucide-react";
import { resolveVideoRender } from "@/lib/video";

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
  videoUrl?: string;
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

function SessionVideo({ session, lang }: { session: SessionItem; lang: string }) {
  const render = resolveVideoRender(session.videoUrl, session.videoPlatform);
  const t = (es: string, en: string) => (lang === "en" ? en : es);

  if (!render) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-md bg-black">
      {render.type === "external" ? (
        <iframe
          src={render.embedUrl}
          title={t(session.title.es, session.title.en)}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="aspect-video w-full"
        />
      ) : render.type === "file" ? (
        <video src={render.url} controls preload="metadata" className="aspect-video w-full bg-black" />
      ) : (
        <div className="p-3">
          <a href={render.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-white underline">
            {t("Abrir video", "Open video")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

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
    <div className="divide-y divide-[#d8e1ea] border-y border-[#d8e1ea]">
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
          <article
            key={session.id}
            className={`py-6 transition-colors ${
              isLocked
                ? "opacity-60"
                : isCompleted
                ? "bg-[#f7fbf8]"
                : ""
            }`}
          >
            <div className="grid gap-4 md:grid-cols-[44px_1fr_auto]">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full ${
                  isCompleted
                    ? "bg-[#d5f5e3] text-[#0f5132]"
                    : "bg-[#e7f0f8] text-primary"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <span className="text-sm font-semibold">{session.order}</span>}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold text-[#17212b]">
                    {t(session.title.es, session.title.en)}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#edf2f7] px-2 py-0.5 text-xs text-[#52667a]">
                    <Icon className="h-3 w-3" />
                    {t(sessionLabels[session.sessionType].es, sessionLabels[session.sessionType].en)}
                  </span>
                  {session.preview && !isEnrolled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#d6eaf8] px-2 py-0.5 text-xs font-medium text-[#0b4f8a]">
                      <Play className="h-3 w-3" />
                      {t("Vista previa", "Preview")}
                    </span>
                  )}
                  {session.durationMinutes && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f7fb] px-2 py-0.5 text-xs text-[#52667a]">
                      <Clock className="h-3 w-3" />
                      {session.durationMinutes} {t("min", "min")}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#d5f5e3] px-2 py-0.5 text-xs font-medium text-[#0f5132]">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("Completada", "Completed")}
                    </span>
                  )}
                </div>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#52667a]">
                  {t(session.description.es, session.description.en)}
                </p>

                {session.scheduledAt && (
                  <p className="mt-2 text-xs text-[#7b8fa1]">
                    <Calendar className="mr-1 inline h-3 w-3" />
                    {new Date(session.scheduledAt).toLocaleDateString(
                      lang === "en" ? "en-US" : "es-ES",
                      { dateStyle: "medium", timeStyle: "short" }
                    )}
                  </p>
                )}

                {!isLocked && session.videoUrl && (
                  <section className="mt-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#17212b]">
                      <MonitorPlay className="h-4 w-4 text-primary" />
                      {t("Video de la sesión", "Session video")}
                      {session.videoPlatform && <span className="text-xs font-normal text-[#7b8fa1]">({session.videoPlatform})</span>}
                    </div>
                    <SessionVideo session={session} lang={lang} />
                  </section>
                )}

                {!isLocked && practicePrompt && (
                  <section className="mt-5 border-l-4 border-[#7aa6d8] bg-[#f7f9fb] px-4 py-3">
                    <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-[#17212b]">
                      <PencilLine className="h-4 w-4 text-primary" />
                      {t("Actividad de práctica", "Practice activity")}
                    </div>
                    <p className="text-sm leading-6 text-[#52667a]">{practicePrompt}</p>
                  </section>
                )}

                {!isLocked && resources.length > 0 && (
                  <section className="mt-5">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#17212b]">
                      <Library className="h-4 w-4 text-primary" />
                      {t("Bibliografía y materiales complementarios", "Bibliography and complementary materials")}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {resources.map((resource) => (
                        <a
                          key={resource.id}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex min-w-0 items-center gap-2 border border-[#d8e1ea] bg-white px-3 py-2 text-sm text-[#17212b] hover:border-primary"
                        >
                          <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                          <span className="truncate">{resource.title}</span>
                          <ExternalLink className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-[#7b8fa1] group-hover:text-primary" />
                        </a>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              <div className="md:justify-self-end">
                {isLocked ? (
                  <div className="inline-flex items-center gap-2 text-xs font-medium text-[#7b8fa1]">
                    <Lock className="h-4 w-4" />
                    {t("Bloqueada", "Locked")}
                  </div>
                ) : isCompleted ? (
                  <CheckCircle2 className="h-5 w-5 text-[#0f5132]" />
                ) : isEnrolled && onMarkComplete ? (
                  <button
                    onClick={() => onMarkComplete(session.id)}
                    disabled={isCompleting}
                    className="inline-flex items-center gap-1 border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
                  >
                    {isCompleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {t("Completar", "Complete")}
                  </button>
                ) : session.preview ? (
                  <Play className="h-5 w-5 text-primary" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
