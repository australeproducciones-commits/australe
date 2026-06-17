import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { Event } from "@/lib/events/types";
import { isEventFeaturedActive } from "@/lib/events/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const EVENT_COLUMNS =
  "id, name, slug, description, main_image_url, thumbnail_url, flyer_url, banner_url, social_presale_price, social_regular_price, box_office_preview, event_date, start_time, end_time, location_name, address, capacity, status, ticket_sale_mode, external_ticket_url, is_featured, featured_ticket_label, featured_until, home_order, sales_qr_enabled, sales_qr_code, sales_qr_url, qr_sell_tickets, qr_products_enabled, qr_show_price_list, qr_sell_products, created_by, created_at, updated_at";

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
    .order("event_date", { ascending: true });

  if (error) {
    console.error("getPublishedEvents:", error);
    return [];
  }

  return ((data ?? []) as Event[]).map(normalizeEventRow);
}

function normalizeEventRow(row: Event): Event {
  return {
    ...row,
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
    console.error("getEventBySalesQrCode:", error);
    return null;
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
    console.error("getPublishedEventBySlug:", error);
    return null;
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
    .eq("is_featured", true)
    .order("home_order", { ascending: true })
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    console.error("getFeaturedEventsForHome:", error);
    return [];
  }

  return ((data ?? []) as Event[])
    .map(normalizeEventRow)
    .filter(isEventFeaturedActive);
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
    console.error("getAllEventsForAdmin:", error);
    return [];
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
    console.error("getEventByIdForAdmin:", error);
    return null;
  }

  return data ? normalizeEventRow(data as Event) : null;
}
