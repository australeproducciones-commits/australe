import {
  DEFAULT_EVENT_IMAGE,
  getEventImage,
  type EventImageFields,
} from "@/lib/events/getEventImage";
import {
  formatStreamDateTime,
  isoToMendozaDatetimeLocal,
} from "@/lib/streaming/datetime";
import { STREAM_STATUS } from "@/lib/streaming/types";
import {
  STREAM_PROVIDER,
  type EventStream,
  type StreamProvider,
  type StreamStatus,
} from "@/lib/streaming/types";

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

const VIMEO_ID_RE = /vimeo\.com\/(?:video\/)?(\d+)/;

export function isUnsafeUrl(value: string): boolean {
  const lower = value.trim().toLowerCase();
  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("//")
  );
}

export function extractYoutubeVideoId(url: string): string | null {
  const match = url.trim().match(YOUTUBE_ID_RE);
  return match?.[1] ?? null;
}

export function extractVimeoVideoId(url: string): string | null {
  const match = url.trim().match(VIMEO_ID_RE);
  return match?.[1] ?? null;
}

export function isValidStreamUrl(
  url: string | null | undefined,
  provider: StreamProvider,
): boolean {
  const trimmed = url?.trim();
  if (!trimmed || isUnsafeUrl(trimmed)) {
    return false;
  }

  switch (provider) {
    case STREAM_PROVIDER.YOUTUBE:
      return extractYoutubeVideoId(trimmed) !== null;
    case STREAM_PROVIDER.VIMEO:
      return extractVimeoVideoId(trimmed) !== null;
    case STREAM_PROVIDER.HLS:
      return (
        trimmed.startsWith("https://") &&
        trimmed.toLowerCase().includes(".m3u8")
      );
    case STREAM_PROVIDER.OTHER:
      try {
        const parsed = new URL(trimmed);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export type EmbedResult =
  | { kind: "iframe"; src: string; title: string }
  | { kind: "hls"; src: string; title: string }
  | { kind: "unsupported"; message: string };

export function resolveStreamEmbed(
  streamUrl: string | null | undefined,
  provider: StreamProvider,
  title = "Transmisión en vivo",
): EmbedResult {
  const url = streamUrl?.trim();
  if (!url || isUnsafeUrl(url)) {
    return { kind: "unsupported", message: "URL de transmisión no válida." };
  }

  if (provider === STREAM_PROVIDER.YOUTUBE) {
    const id = extractYoutubeVideoId(url);
    if (!id) {
      return { kind: "unsupported", message: "No se pudo interpretar el video de YouTube." };
    }
    return {
      kind: "iframe",
      src: `https://www.youtube.com/embed/${id}`,
      title,
    };
  }

  if (provider === STREAM_PROVIDER.VIMEO) {
    const id = extractVimeoVideoId(url);
    if (!id) {
      return { kind: "unsupported", message: "No se pudo interpretar el video de Vimeo." };
    }
    return {
      kind: "iframe",
      src: `https://player.vimeo.com/video/${id}`,
      title,
    };
  }

  if (provider === STREAM_PROVIDER.HLS) {
    if (!url.toLowerCase().includes(".m3u8")) {
      return { kind: "unsupported", message: "La URL HLS debe terminar en .m3u8" };
    }
    return { kind: "hls", src: url, title };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { kind: "unsupported", message: "Protocolo no permitido." };
    }
    return { kind: "iframe", src: url, title };
  } catch {
    return { kind: "unsupported", message: "URL no válida." };
  }
}

export function isStreamPubliclyVisible(stream: Pick<EventStream, "is_enabled" | "status">): boolean {
  return stream.is_enabled && stream.status !== STREAM_STATUS.DRAFT;
}

export function shouldShowPlayer(status: StreamStatus): boolean {
  return status === STREAM_STATUS.LIVE;
}

export function shouldShowCountdown(status: StreamStatus): boolean {
  return status === STREAM_STATUS.SCHEDULED;
}

export function getStreamDisplayTitle(
  stream: Pick<EventStream, "title">,
  eventName: string,
): string {
  return stream.title?.trim() || eventName;
}

export function getDefaultButtonLabel(status: StreamStatus): string {
  switch (status) {
    case STREAM_STATUS.LIVE:
      return "Ver transmisión";
    case STREAM_STATUS.SCHEDULED:
      return "Ver detalles";
    case STREAM_STATUS.ENDED:
      return "Transmisión finalizada";
    case STREAM_STATUS.PAUSED:
      return "Transmisión pausada";
    default:
      return "Ver transmisión";
  }
}

export function resolveStreamButtonLabel(
  stream: Pick<EventStream, "button_label" | "status">,
): string {
  const custom = stream.button_label?.trim();
  if (custom) {
    return custom;
  }
  return getDefaultButtonLabel(stream.status);
}

type StreamBannerEvent = EventImageFields;

export function resolveStreamBannerDesktop(
  stream: Pick<EventStream, "stream_banner_url">,
  event: StreamBannerEvent,
): string {
  const custom = stream.stream_banner_url?.trim();
  if (custom) {
    return custom;
  }
  return getEventImage(event);
}

export function resolveStreamBannerMobile(
  stream: Pick<EventStream, "stream_banner_url" | "stream_banner_mobile_url">,
  event: StreamBannerEvent,
): string {
  const mobile = stream.stream_banner_mobile_url?.trim();
  if (mobile) {
    return mobile;
  }
  const flyer = event.flyer_url?.trim();
  if (flyer) {
    return flyer;
  }
  const main = event.main_image_url?.trim();
  if (main) {
    return main;
  }
  const desktop = stream.stream_banner_url?.trim();
  if (desktop) {
    return desktop;
  }
  return getEventImage(event);
}

export function getStreamBannerAlt(
  stream: Pick<EventStream, "title">,
  eventName: string,
): string {
  const title = stream.title?.trim();
  if (title) {
    return `Banner de transmisión: ${title}`;
  }
  return `Banner de transmisión de ${eventName}`;
}

export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function streamToFormInput(stream: EventStream) {
  return {
    title: stream.title ?? "",
    subtitle: stream.subtitle ?? "",
    is_enabled: stream.is_enabled,
    status: stream.status,
    provider: stream.provider,
    stream_url: stream.stream_url ?? "",
    starts_at: stream.starts_at ? isoToMendozaDatetimeLocal(stream.starts_at) : "",
    ends_at: stream.ends_at ? isoToMendozaDatetimeLocal(stream.ends_at) : "",
    stream_banner_url: stream.stream_banner_url ?? "",
    stream_banner_mobile_url: stream.stream_banner_mobile_url ?? "",
    home_featured: stream.home_featured,
    home_order: stream.home_order,
    show_on_streaming_page: stream.show_on_streaming_page,
    show_on_event_page: stream.show_on_event_page,
    button_label: stream.button_label ?? "",
  };
}

export { formatStreamDateTime };

export function getStatusBadgeVariant(
  status: StreamStatus,
): "live" | "scheduled" | "paused" | "ended" | "draft" {
  switch (status) {
    case STREAM_STATUS.LIVE:
      return "live";
    case STREAM_STATUS.SCHEDULED:
      return "scheduled";
    case STREAM_STATUS.PAUSED:
      return "paused";
    case STREAM_STATUS.ENDED:
      return "ended";
    default:
      return "draft";
  }
}

export function parseStreamFormData(formData: FormData): {
  title: string;
  subtitle: string;
  is_enabled: boolean;
  status: StreamStatus;
  provider: StreamProvider;
  stream_url: string;
  starts_at: string;
  ends_at: string;
  stream_banner_url: string;
  stream_banner_mobile_url: string;
  home_featured: boolean;
  home_order: number;
  show_on_streaming_page: boolean;
  show_on_event_page: boolean;
  button_label: string;
} {
  return {
    title: String(formData.get("title") ?? ""),
    subtitle: String(formData.get("subtitle") ?? ""),
    is_enabled: formData.get("is_enabled") === "on",
    status: String(formData.get("status") ?? STREAM_STATUS.DRAFT) as StreamStatus,
    provider: String(formData.get("provider") ?? STREAM_PROVIDER.YOUTUBE) as StreamProvider,
    stream_url: String(formData.get("stream_url") ?? ""),
    starts_at: String(formData.get("starts_at") ?? ""),
    ends_at: String(formData.get("ends_at") ?? ""),
    stream_banner_url: String(formData.get("stream_banner_url") ?? ""),
    stream_banner_mobile_url: String(formData.get("stream_banner_mobile_url") ?? ""),
    home_featured: formData.get("home_featured") === "on",
    home_order: Number(formData.get("home_order") ?? 0) || 0,
    show_on_streaming_page: formData.get("show_on_streaming_page") === "on",
    show_on_event_page: formData.get("show_on_event_page") === "on",
    button_label: String(formData.get("button_label") ?? ""),
  };
}

export function validateStreamInput(input: ReturnType<typeof parseStreamFormData>): string | null {
  if (!input.is_enabled && input.status !== STREAM_STATUS.DRAFT) {
    return "Una transmisión deshabilitada solo puede estar en borrador.";
  }

  if (
    (input.status === STREAM_STATUS.SCHEDULED || input.status === STREAM_STATUS.LIVE) &&
    !input.starts_at.trim()
  ) {
    return "Indicá fecha y hora de inicio para transmisiones programadas o en vivo.";
  }

  if (input.status === STREAM_STATUS.LIVE) {
    if (!input.stream_url.trim()) {
      return "Indicá la URL de transmisión para el estado en vivo.";
    }
    if (!isValidStreamUrl(input.stream_url, input.provider)) {
      return "La URL de transmisión no es válida para el proveedor seleccionado.";
    }
  }

  if (input.stream_url.trim() && !isValidStreamUrl(input.stream_url, input.provider)) {
    return "La URL de transmisión no es válida para el proveedor seleccionado.";
  }

  return null;
}

export { DEFAULT_EVENT_IMAGE };
