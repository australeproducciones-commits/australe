import type { GalleryMediaType } from "@/lib/events/gallery/types";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export type ParsedGalleryVideo = {
  mediaType: "youtube" | "vimeo";
  mediaUrl: string;
  embedUrl: string;
  thumbnailUrl: string | null;
};

function parseYoutubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();

    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/")[0];
      return id || null;
    }

    if (YOUTUBE_HOSTS.has(host)) {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/")[2] ?? null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.split("/")[2] ?? null;
      }
      return url.searchParams.get("v");
    }
  } catch {
    return null;
  }

  return null;
}

function parseVimeoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase();
    if (!VIMEO_HOSTS.has(host)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.find((part) => /^\d+$/.test(part));
    return id ?? null;
  } catch {
    return null;
  }
}

export function parseGalleryVideoInput(
  mediaType: GalleryMediaType,
  rawInput: string,
): ParsedGalleryVideo | null {
  if (mediaType === "image") {
    return null;
  }

  if (mediaType === "youtube") {
    const id = parseYoutubeId(rawInput);
    if (!id) return null;
    return {
      mediaType: "youtube",
      mediaUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const id = parseVimeoId(rawInput);
  if (!id) return null;

  return {
    mediaType: "vimeo",
    mediaUrl: `https://vimeo.com/${id}`,
    embedUrl: `https://player.vimeo.com/video/${id}`,
    thumbnailUrl: null,
  };
}

export function isSafeGalleryImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const GALLERY_IMAGE_BUCKET = "event-gallery";
export const GALLERY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const GALLERY_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
