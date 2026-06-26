import { requireAdminPage } from "@/lib/auth/requestAuth";
import { EVENT_AUDIENCE } from "@/lib/constants/event-audience";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { Event } from "@/lib/events/types";
import { filterFeaturedHomeContent } from "@/lib/events/filters";
import {
  EVENTS_LOAD_ERROR_MESSAGE,
  PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
  SupabaseQueryError,
  throwSupabaseQueryError,
} from "@/lib/supabase/queryError";
import { createPublicClient } from "@/lib/supabase/public";
import { CACHE_TAGS } from "@/lib/supabase/cacheTags";
import {
  logSlowQuery,
  QueryTimeoutError,
  withQueryTimeout,
} from "@/lib/supabase/queryTimeout";
import { createClient } from "@/lib/supabase/server";
import { unstable_cache } from "next/cache";

const EVENT_COLUMNS =
  "id, name, slug, description, content_kind, main_image_url, thumbnail_url, flyer_url, banner_url, social_presale_price, social_regular_price, box_office_preview, event_date, event_end_date, start_time, end_time, location_name, address, capacity, status, audience, financial_management_status, financial_closed_at, financial_closed_by, ticket_sale_mode, external_ticket_url, sale_web_enabled, external_sale_enabled, sale_whatsapp_enabled, reservation_enabled, whatsapp_sale_number, whatsapp_sale_message, is_featured, featured_ticket_label, featured_until, home_order, sales_qr_enabled, sales_qr_code, sales_qr_url, qr_sell_tickets, qr_products_enabled, qr_show_price_list, qr_sell_products, created_by, created_at, updated_at";

export { requireAdminPage } from "@/lib/auth/requestAuth";

async function fetchPublishedEventsUncached(): Promise<Event[]> {
  const supabase = createPublicClient();
  const started = Date.now();

  const { data, error } = await withQueryTimeout("getPublishedEvents", (signal) =>
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("status", EVENT_STATUS.PUBLISHED)
      .eq("audience", EVENT_AUDIENCE.PUBLIC)
      .order("event_date", { ascending: true })
      .abortSignal(signal),
  );

  logSlowQuery("getPublishedEvents", Date.now() - started);

  if (error) {
    throwSupabaseQueryError(
      "getPublishedEvents",
      error,
      PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
    );
  }

  return ((data ?? []) as Event[]).map(normalizeEventRow);
}

const getPublishedEventsCached = unstable_cache(
  fetchPublishedEventsUncached,
  ["public-published-events"],
  { revalidate: 120, tags: [CACHE_TAGS.publishedEvents] },
);

export async function getPublishedEvents(): Promise<Event[]> {
  try {
    return await getPublishedEventsCached();
  } catch (error) {
    if (error instanceof QueryTimeoutError) {
      throw new SupabaseQueryError(
        "getPublishedEvents",
        error,
        PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
      );
    }
    throw error;
  }
}

function normalizeEventRow(row: Event): Event {
  return {
    ...row,
    content_kind: row.content_kind ?? "event",
    event_end_date: row.event_end_date ?? null,
    audience: row.audience ?? EVENT_AUDIENCE.PUBLIC,
    financial_management_status: row.financial_management_status ?? "open",
    financial_closed_at: row.financial_closed_at ?? null,
    financial_closed_by: row.financial_closed_by ?? null,
    main_image_url: row.main_image_url ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    flyer_url: row.flyer_url ?? null,
    banner_url: row.banner_url ?? null,
    social_presale_price: row.social_presale_price ?? null,
    social_regular_price: row.social_regular_price ?? null,
    box_office_preview: row.box_office_preview ?? null,
    featured_ticket_label: row.featured_ticket_label ?? null,
    featured_until: row.featured_until ?? null,
    home_order: row.home_order ?? 0,
    sales_qr_enabled: row.sales_qr_enabled ?? false,
    sales_qr_code: row.sales_qr_code ?? null,
    sales_qr_url: row.sales_qr_url ?? null,
    qr_sell_tickets: row.qr_sell_tickets ?? false,
    qr_products_enabled: row.qr_products_enabled ?? false,
    qr_show_price_list: row.qr_show_price_list ?? false,
    qr_sell_products: row.qr_sell_products ?? false,
    sale_web_enabled: row.sale_web_enabled ?? true,
    external_sale_enabled: row.external_sale_enabled ?? false,
    sale_whatsapp_enabled: row.sale_whatsapp_enabled ?? false,
    reservation_enabled: row.reservation_enabled ?? true,
    whatsapp_sale_number: row.whatsapp_sale_number ?? null,
    whatsapp_sale_message: row.whatsapp_sale_message ?? null,
  };
}

export async function getEventBySalesQrCode(code: string): Promise<Event | null> {
  const supabase = await createClient();
  const normalized = code.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("sales_qr_code", normalized)
    .eq("sales_qr_enabled", true)
    .maybeSingle();

  if (error) {
    throwSupabaseQueryError("getEventBySalesQrCode", error);
  }

  return data ? normalizeEventRow(data as Event) : null;
}

export async function getPublishedEventBySlug(
  slug: string,
): Promise<Event | null> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("slug", slug)
    .eq("status", EVENT_STATUS.PUBLISHED)
    .maybeSingle();

  if (error) {
    throwSupabaseQueryError(
      "getPublishedEventBySlug",
      error,
      PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
    );
  }

  return data ? normalizeEventRow(data as Event) : null;
}

export async function getFeaturedPublishedEvents(): Promise<Event[]> {
  return getFeaturedEventsForHome();
}

/** Eventos destacados activos para la home (derivados de la cartelera publicada). */
export async function getFeaturedEventsForHome(
  publishedEvents?: Event[],
): Promise<Event[]> {
  const events = publishedEvents ?? (await getPublishedEvents());
  return filterFeaturedHomeContent(events);
}

/** Eventos publicados exclusivos para miembros activos de la comunidad. */
export async function getCommunityPublishedEvents(): Promise<Event[]> {
  const supabase = createPublicClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", EVENT_STATUS.PUBLISHED)
    .eq("audience", EVENT_AUDIENCE.COMMUNITY)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throwSupabaseQueryError(
      "getCommunityPublishedEvents",
      error,
      PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
    );
  }

  return ((data ?? []) as Event[]).map(normalizeEventRow);
}

export async function getFeaturedPublishedEvent(): Promise<Event | null> {
  const events = await getFeaturedPublishedEvents();
  return events[0] ?? null;
}

export async function getAllEventsForAdmin(): Promise<Event[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("event_date", { ascending: false });

  if (error) {
    throwSupabaseQueryError("getAllEventsForAdmin", error, EVENTS_LOAD_ERROR_MESSAGE);
  }

  return ((data ?? []) as Event[]).map(normalizeEventRow);
}

export async function getEventByIdForAdmin(id: string): Promise<Event | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwSupabaseQueryError("getEventByIdForAdmin", error, EVENTS_LOAD_ERROR_MESSAGE);
  }

  return data ? normalizeEventRow(data as Event) : null;
}
