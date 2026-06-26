import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  EventStream,
  EventStreamEventInfo,
  EventStreamWithEvent,
} from "@/lib/streaming/types";
import { STREAM_STATUS } from "@/lib/streaming/types";
import { isStreamPubliclyVisible } from "@/lib/streaming/utils";

const STREAM_SELECT = `
  id,
  event_id,
  title,
  subtitle,
  is_enabled,
  status,
  provider,
  stream_url,
  starts_at,
  ends_at,
  access_type,
  stream_banner_url,
  stream_banner_mobile_url,
  home_featured,
  home_order,
  show_on_streaming_page,
  show_on_event_page,
  button_label,
  created_by,
  created_at,
  updated_at,
  event:events!inner (
    id,
    name,
    slug,
    event_date,
    start_time,
    end_time,
    location_name,
    banner_url,
    main_image_url,
    flyer_url,
    thumbnail_url,
    audience,
    status
  )
`;

type StreamRow = EventStream & { event: EventStreamEventInfo | EventStreamEventInfo[] };

function mapStreamRow(row: StreamRow): EventStreamWithEvent | null {
  const event = Array.isArray(row.event) ? row.event[0] : row.event;
  if (!event) {
    return null;
  }
  const {
    id,
    event_id,
    title,
    subtitle,
    is_enabled,
    status,
    provider,
    stream_url,
    starts_at,
    ends_at,
    access_type,
    stream_banner_url,
    stream_banner_mobile_url,
    home_featured,
    home_order,
    show_on_streaming_page,
    show_on_event_page,
    button_label,
    created_by,
    created_at,
    updated_at,
  } = row;
  return {
    id,
    event_id,
    title,
    subtitle,
    is_enabled,
    status,
    provider,
    stream_url,
    starts_at,
    ends_at,
    access_type,
    stream_banner_url,
    stream_banner_mobile_url,
    home_featured,
    home_order,
    show_on_streaming_page,
    show_on_event_page,
    button_label,
    created_by,
    created_at,
    updated_at,
    event,
  };
}

function filterPublicStreams(
  streams: EventStreamWithEvent[],
  options?: { streamingPage?: boolean; eventPage?: boolean },
): EventStreamWithEvent[] {
  return streams.filter((item) => {
    if (!isStreamPubliclyVisible(item)) {
      return false;
    }
    if (item.event.status !== "published") {
      return false;
    }
    if (options?.streamingPage && !item.show_on_streaming_page) {
      return false;
    }
    if (options?.eventPage && !item.show_on_event_page) {
      return false;
    }
    return true;
  });
}

function sortByStartsAt(streams: EventStreamWithEvent[]): EventStreamWithEvent[] {
  return [...streams].sort((a, b) => {
    const aTime = a.starts_at ? Date.parse(a.starts_at) : Number.MAX_SAFE_INTEGER;
    const bTime = b.starts_at ? Date.parse(b.starts_at) : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function sortFeatured(streams: EventStreamWithEvent[]): EventStreamWithEvent[] {
  return [...streams].sort((a, b) => {
    if (a.home_order !== b.home_order) {
      return a.home_order - b.home_order;
    }
    const aTime = a.starts_at ? Date.parse(a.starts_at) : Number.MAX_SAFE_INTEGER;
    const bTime = b.starts_at ? Date.parse(b.starts_at) : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) {
      return aTime - bTime;
    }
    return a.id.localeCompare(b.id);
  });
}

export async function getPublicStreamsForPage(): Promise<EventStreamWithEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_streams")
    .select(STREAM_SELECT)
    .eq("is_enabled", true)
    .neq("status", STREAM_STATUS.DRAFT)
    .eq("show_on_streaming_page", true)
    .order("starts_at", { ascending: true, nullsFirst: false });

  if (error || !data) {
    console.error("getPublicStreamsForPage:", error?.message);
    return [];
  }

  return filterPublicStreams(
    data.map((row) => mapStreamRow(row as StreamRow)).filter(Boolean) as EventStreamWithEvent[],
    { streamingPage: true },
  );
}

export function groupPublicStreams(streams: EventStreamWithEvent[]) {
  const live = streams.filter((s) => s.status === STREAM_STATUS.LIVE);
  const upcoming = streams.filter((s) => s.status === STREAM_STATUS.SCHEDULED);
  const paused = streams.filter((s) => s.status === STREAM_STATUS.PAUSED);
  const ended = streams.filter((s) => s.status === STREAM_STATUS.ENDED);

  return {
    live: sortByStartsAt(live),
    upcoming: sortByStartsAt(upcoming),
    paused: sortByStartsAt(paused),
    ended: [...ended].sort((a, b) => {
      const aTime = a.ends_at ? Date.parse(a.ends_at) : a.starts_at ? Date.parse(a.starts_at) : 0;
      const bTime = b.ends_at ? Date.parse(b.ends_at) : b.starts_at ? Date.parse(b.starts_at) : 0;
      return bTime - aTime;
    }),
  };
}

export async function getPublicStreamByEventSlug(
  slug: string,
): Promise<EventStreamWithEvent | null> {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (eventError || !event) {
    return null;
  }

  const { data, error } = await supabase
    .from("event_streams")
    .select(STREAM_SELECT)
    .eq("event_id", event.id)
    .eq("is_enabled", true)
    .neq("status", STREAM_STATUS.DRAFT)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const mapped = mapStreamRow(data as StreamRow);
  if (!mapped || !isStreamPubliclyVisible(mapped)) {
    return null;
  }
  return mapped;
}

export async function getPublicStreamForEventPage(
  eventId: string,
): Promise<EventStreamWithEvent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_streams")
    .select(STREAM_SELECT)
    .eq("event_id", eventId)
    .eq("is_enabled", true)
    .neq("status", STREAM_STATUS.DRAFT)
    .eq("show_on_event_page", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const mapped = mapStreamRow(data as StreamRow);
  if (!mapped || !isStreamPubliclyVisible(mapped)) {
    return null;
  }
  return mapped;
}

export async function getFeaturedHomeStream(): Promise<EventStreamWithEvent | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_streams")
    .select(STREAM_SELECT)
    .eq("is_enabled", true)
    .eq("home_featured", true)
    .neq("status", STREAM_STATUS.DRAFT)
    .in("status", [STREAM_STATUS.LIVE, STREAM_STATUS.SCHEDULED])
    .order("home_order", { ascending: true })
    .order("starts_at", { ascending: true });

  if (error || !data?.length) {
    return null;
  }

  const streams = filterPublicStreams(
    data.map((row) => mapStreamRow(row as StreamRow)).filter(Boolean) as EventStreamWithEvent[],
  ).filter((item) => item.event.audience === "public");

  const sorted = sortFeatured(streams);
  const live = sorted.find((s) => s.status === STREAM_STATUS.LIVE);
  if (live) {
    return live;
  }
  return sorted.find((s) => s.status === STREAM_STATUS.SCHEDULED) ?? null;
}

export async function getAdminStreamsByEventId(
  eventId: string,
): Promise<EventStream[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_streams")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAdminStreamsByEventId:", error.message);
    return [];
  }

  return (data ?? []) as EventStream[];
}

export async function getAdminStreamById(
  streamId: string,
): Promise<EventStream | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("event_streams")
    .select("*")
    .eq("id", streamId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as EventStream;
}
