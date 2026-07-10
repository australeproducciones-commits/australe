import type { EventGalleryItem } from "@/lib/events/gallery/types";
import type { Event } from "@/lib/events/types";
import { filterFinishedGalleryEvents } from "@/lib/events/filters";
import { getPublishedEvents } from "@/lib/events/queries";
import {
  PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
  throwSupabaseQueryError,
} from "@/lib/supabase/queryError";
import { createPublicClient } from "@/lib/supabase/public";
import { CACHE_TAGS } from "@/lib/supabase/cacheTags";
import { unstable_cache } from "next/cache";

const GALLERY_ITEM_COLUMNS =
  "id, event_id, media_type, media_url, thumbnail_url, caption, sort_order, is_published, created_by, created_at, updated_at";

async function fetchFinishedGalleryEventsUncached(): Promise<Event[]> {
  const published = await getPublishedEvents();
  return filterFinishedGalleryEvents(published);
}

const getFinishedGalleryEventsCached = unstable_cache(
  fetchFinishedGalleryEventsUncached,
  ["public-finished-gallery-events"],
  { revalidate: 120, tags: [CACHE_TAGS.eventGalleries, CACHE_TAGS.publishedEvents] },
);

export async function getFinishedGalleryEvents(): Promise<Event[]> {
  return getFinishedGalleryEventsCached();
}

export async function getPublishedGalleryEventBySlug(
  slug: string,
): Promise<Event | null> {
  const events = await getFinishedGalleryEvents();
  return events.find((event) => event.slug === slug) ?? null;
}

export async function getPublishedGalleryItemsByEventId(
  eventId: string,
): Promise<EventGalleryItem[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("event_gallery_items")
    .select(GALLERY_ITEM_COLUMNS)
    .eq("event_id", eventId)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throwSupabaseQueryError(
      "getPublishedGalleryItemsByEventId",
      error,
      PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
    );
  }

  return (data ?? []) as EventGalleryItem[];
}

export async function getAdminGalleryItemsByEventId(
  eventId: string,
): Promise<EventGalleryItem[]> {
  const { createClient } = await import("@/lib/supabase/server");
  const { getProfile } = await import("@/lib/auth/getProfile");
  const { ROLES } = await import("@/lib/constants/roles");

  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return [];
  }

  const { data, error } = await supabase
    .from("event_gallery_items")
    .select(GALLERY_ITEM_COLUMNS)
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throwSupabaseQueryError("getAdminGalleryItemsByEventId", error);
  }

  return (data ?? []) as EventGalleryItem[];
}

export async function getGalleryItemsForEvents(
  eventIds: string[],
): Promise<Map<string, EventGalleryItem[]>> {
  if (eventIds.length === 0) {
    return new Map();
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("event_gallery_items")
    .select(GALLERY_ITEM_COLUMNS)
    .in("event_id", eventIds)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throwSupabaseQueryError("getGalleryItemsForEvents", error);
  }

  const map = new Map<string, EventGalleryItem[]>();
  for (const item of (data ?? []) as EventGalleryItem[]) {
    const current = map.get(item.event_id) ?? [];
    current.push(item);
    map.set(item.event_id, current);
  }

  return map;
}
