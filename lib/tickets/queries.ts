import { EVENT_STATUS } from "@/lib/constants/event-status";
import { getEventByIdForAdmin, requireAdminPage } from "@/lib/events/queries";
import type { TicketType } from "@/lib/tickets/types";
import { createClient } from "@/lib/supabase/server";

const TICKET_TYPE_COLUMNS =
  "id, event_id, name, description, public_price, community_price, stock_total, stock_sold, max_per_order, sale_start_at, sale_end_at, is_active, sort_order, created_at, updated_at";

export async function getTicketTypesByEventIdForAdmin(
  eventId: string,
): Promise<TicketType[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("ticket_types")
    .select(TICKET_TYPE_COLUMNS)
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("getTicketTypesByEventIdForAdmin:", error.message);
    return [];
  }

  return (data ?? []) as TicketType[];
}

export async function getTicketTypeByIdForAdmin(
  ticketTypeId: string,
): Promise<TicketType | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("ticket_types")
    .select(TICKET_TYPE_COLUMNS)
    .eq("id", ticketTypeId)
    .maybeSingle();

  if (error) {
    console.error("getTicketTypeByIdForAdmin:", error.message);
    return null;
  }

  return (data as TicketType | null) ?? null;
}

export async function getActiveTicketTypesByEventId(
  eventId: string,
): Promise<TicketType[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ticket_types")
    .select(TICKET_TYPE_COLUMNS)
    .eq("event_id", eventId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("public_price", { ascending: true });

  if (error) {
    console.error("getActiveTicketTypesByEventId:", error.message);
    return [];
  }

  return (data ?? []) as TicketType[];
}

export async function getActiveTicketTypesForPublishedEvent(
  eventId: string,
  eventStatus: string,
): Promise<TicketType[]> {
  if (eventStatus !== EVENT_STATUS.PUBLISHED) {
    return [];
  }

  return getActiveTicketTypesByEventId(eventId);
}

export async function getEventWithTicketTypesForAdmin(eventId: string) {
  const event = await getEventByIdForAdmin(eventId);

  if (!event) {
    return null;
  }

  const ticketTypes = await getTicketTypesByEventIdForAdmin(eventId);

  return { event, ticketTypes };
}

export async function hasTicketsSoldForType(
  ticketTypeId: string,
): Promise<boolean> {
  const { supabase } = await requireAdminPage();

  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("ticket_type_id", ticketTypeId);

  if (error) {
    console.error("hasTicketsSoldForType:", error.message);
    return true;
  }

  return (count ?? 0) > 0;
}
