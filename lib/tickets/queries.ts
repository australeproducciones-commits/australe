import { EVENT_STATUS } from "@/lib/constants/event-status";
import { getEventByIdForAdmin, requireAdminPage } from "@/lib/events/queries";
import type { TicketType } from "@/lib/tickets/types";
import { createPublicClient } from "@/lib/supabase/public";

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
  const supabase = createPublicClient();

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

export async function getActiveTicketTypesForPublishedEvents(
  eventIds: string[],
): Promise<Map<string, TicketType[]>> {
  const result = new Map<string, TicketType[]>();

  if (eventIds.length === 0) {
    return result;
  }

  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("ticket_types")
    .select(TICKET_TYPE_COLUMNS)
    .in("event_id", eventIds)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("public_price", { ascending: true });

  if (error) {
    console.error("getActiveTicketTypesForPublishedEvents:", error.message);
    return result;
  }

  for (const row of (data ?? []) as TicketType[]) {
    const current = result.get(row.event_id) ?? [];
    current.push(row);
    result.set(row.event_id, current);
  }

  return result;
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
