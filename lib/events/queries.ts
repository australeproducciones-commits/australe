import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { EVENT_AUDIENCE } from "@/lib/constants/event-audience";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { Event } from "@/lib/events/types";
import { isEventFeaturedActive } from "@/lib/events/utils";
import {
  EVENTS_LOAD_ERROR_MESSAGE,
  PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
  throwSupabaseQueryError,
} from "@/lib/supabase/queryError";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const EVENT_COLUMNS =
  "id, name, slug, description, main_image_url, thumbnail_url, flyer_url, banner_url, social_presale_price, social_regular_price, box_office_preview, event_date, start_time, end_time, location_name, address, capacity, status, audience, financial_management_status, financial_closed_at, financial_closed_by, ticket_sale_mode, external_ticket_url, is_featured, featured_ticket_label, featured_until, home_order, sales_qr_enabled, sales_qr_code, sales_qr_url, qr_sell_tickets, qr_products_enabled, qr_show_price_list, qr_sell_products, created_by, created_at, updated_at";

export async function requireAdminPage() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    redirect(ROUTES.admin);
  }

  return { supabase, profile };
}

export async function getPublishedEvents(): Promise<Event[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", EVENT_STATUS.PUBLISHED)
    .eq("audience", EVENT_AUDIENCE.PUBLIC)
    .order("event_date", { ascending: true });

  if (error) {
    throwSupabaseQueryError(
      "getPublishedEvents",
      error,
      PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
    );
  }

  return ((data ?? []) as Event[]).map(normalizeEventRow);
}

function normalizeEventRow(row: Event): Event {
  return {
    ...row,
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
  const supabase = await createClient();

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

/** Eventos destacados activos para la home (hero y promos). */
export async function getFeaturedEventsForHome(): Promise<Event[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", EVENT_STATUS.PUBLISHED)
    .eq("audience", EVENT_AUDIENCE.PUBLIC)
    .eq("is_featured", true)
    .order("home_order", { ascending: true })
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throwSupabaseQueryError(
      "getFeaturedEventsForHome",
      error,
      PUBLIC_EVENTS_LOAD_ERROR_MESSAGE,
    );
  }

  return ((data ?? []) as Event[])
    .map(normalizeEventRow)
    .filter(isEventFeaturedActive);
}

/** Eventos publicados exclusivos para miembros activos de la comunidad. */
export async function getCommunityPublishedEvents(): Promise<Event[]> {
  const supabase = await createClient();

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
