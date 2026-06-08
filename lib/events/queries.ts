import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { Event } from "@/lib/events/types";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const EVENT_COLUMNS =
  "id, name, slug, description, flyer_url, banner_url, event_date, start_time, end_time, location_name, address, capacity, status, is_featured, external_ticket_url, ticket_sale_mode, created_by, created_at, updated_at";

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
    console.error("getPublishedEvents:", error.message);
    return [];
  }

  return (data ?? []) as Event[];
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
    console.error("getPublishedEventBySlug:", error.message);
    return null;
  }

  return (data as Event | null) ?? null;
}

export async function getFeaturedPublishedEvent(): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("status", EVENT_STATUS.PUBLISHED)
    .eq("is_featured", true)
    .order("event_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getFeaturedPublishedEvent:", error.message);
    return null;
  }

  return (data as Event | null) ?? null;
}

export async function getAllEventsForAdmin(): Promise<Event[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .order("event_date", { ascending: false });

  if (error) {
    console.error("getAllEventsForAdmin:", error.message);
    return [];
  }

  return (data ?? []) as Event[];
}

export async function getEventByIdForAdmin(id: string): Promise<Event | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getEventByIdForAdmin:", error.message);
    return null;
  }

  return (data as Event | null) ?? null;
}
