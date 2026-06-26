export const STREAM_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  LIVE: "live",
  ENDED: "ended",
  PAUSED: "paused",
} as const;

export type StreamStatus =
  (typeof STREAM_STATUS)[keyof typeof STREAM_STATUS];

export const STREAM_PROVIDER = {
  YOUTUBE: "youtube",
  VIMEO: "vimeo",
  HLS: "hls",
  OTHER: "other",
} as const;

export type StreamProvider =
  (typeof STREAM_PROVIDER)[keyof typeof STREAM_PROVIDER];

export const STREAM_ACCESS_TYPE = {
  FREE: "free",
} as const;

export type StreamAccessType =
  (typeof STREAM_ACCESS_TYPE)[keyof typeof STREAM_ACCESS_TYPE];

export type EventStream = {
  id: string;
  event_id: string;
  title: string | null;
  subtitle: string | null;
  is_enabled: boolean;
  status: StreamStatus;
  provider: StreamProvider;
  stream_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  access_type: StreamAccessType;
  stream_banner_url: string | null;
  stream_banner_mobile_url: string | null;
  home_featured: boolean;
  home_order: number;
  show_on_streaming_page: boolean;
  show_on_event_page: boolean;
  button_label: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventStreamEventInfo = {
  id: string;
  name: string;
  slug: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  banner_url: string | null;
  main_image_url: string | null;
  flyer_url: string | null;
  thumbnail_url: string | null;
  audience: string;
  status: string;
};

export type EventStreamWithEvent = EventStream & {
  event: EventStreamEventInfo;
};

export type EventStreamFormInput = {
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
};

export type StreamActionResult = {
  ok: boolean;
  message?: string;
  streamId?: string;
};

export const STREAM_STATUS_LABELS: Record<StreamStatus, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  live: "En vivo",
  ended: "Finalizado",
  paused: "Pausado",
};

export const STREAM_PROVIDER_LABELS: Record<StreamProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  hls: "HLS (.m3u8)",
  other: "Otro",
};
