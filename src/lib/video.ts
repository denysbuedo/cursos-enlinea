export type VideoRender =
  | { type: "external"; embedUrl: string }
  | { type: "file"; url: string }
  | { type: "link"; url: string };

function getYouTubeId(url: URL): string | null {
  if (url.hostname.includes("youtu.be")) return url.pathname.slice(1) || null;
  if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || null;
  return url.searchParams.get("v");
}

function getVimeoId(url: URL): string | null {
  const match = url.pathname.match(/\/(?:video\/)?(\d+)/);
  return match?.[1] || null;
}

export function resolveVideoRender(videoUrl?: string | null, videoPlatform?: string | null): VideoRender | null {
  if (!videoUrl) return null;
  const platform = (videoPlatform || "").toUpperCase();

  if (videoUrl.startsWith("/api/uploads/") || platform === "LOCAL_UPLOAD") {
    return { type: "file", url: videoUrl };
  }

  try {
    const url = new URL(videoUrl);
    if (platform === "YOUTUBE" || url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      const id = getYouTubeId(url);
      if (id) return { type: "external", embedUrl: `https://www.youtube.com/embed/${id}` };
    }
    if (platform === "VIMEO" || url.hostname.includes("vimeo.com")) {
      const id = getVimeoId(url);
      if (id) return { type: "external", embedUrl: `https://player.vimeo.com/video/${id}` };
    }
  } catch {
    return { type: "link", url: videoUrl };
  }

  return { type: "link", url: videoUrl };
}
