import { getProfile } from "@/lib/auth/getProfile";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { requireAdminPage } from "@/lib/events/queries";
import type { TicketType } from "@/lib/tickets/types";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";
import type {
  CustomerTicket,
  EventReservationContext,
  Ticket,
  TicketWithTypeName,
} from "@/lib/ticket-sales/types";
import { filterTicketTypesOnSale } from "@/lib/ticket-sales/utils";
import { createClient } from "@/lib/supabase/server";

const TICKET_COLUMNS =
  "id, event_id, ticket_type_id, user_id, community_member_id, buyer_name, buyer_whatsapp, buyer_dni, qr_token, qr_image_url, price_paid, original_price, discount_amount, payment_method, payment_status, ticket_status, sales_channel, reservation_expires_at, used_at, used_by, sold_by, cancelled_at, cancelled_by, cancel_reason, created_at, updated_at";

export async function getPublishedEventReservationContext(
  slug: string,
): Promise<EventReservationContext | null> {
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    return null;
  }

  const allActive = await getActiveTicketTypesForPublishedEvent(
    event.id,
    event.status,
  );
  const ticketTypes = filterTicketTypesOnSale(allActive);

  return { event, ticketTypes };
}

export async function getTicketTypeForReservation(
  ticketTypeId: string,
  eventId: string,
): Promise<TicketType | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ticket_types")
    .select(
      "id, event_id, name, description, public_price, community_price, stock_total, stock_sold, max_per_order, sale_start_at, sale_end_at, is_active, sort_order, created_at, updated_at",
    )
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as TicketType;
}

export async function getCommunityMemberIdForProfile(
  profileId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_members")
    .select("id")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data.id;
}

export async function getCustomerTickets(): Promise<CustomerTicket[]> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile) {
    return [];
  }

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(TICKET_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getCustomerTickets:", error.message);
    return [];
  }

  if (!tickets?.length) {
    return [];
  }

  const eventIds = [...new Set(tickets.map((t) => t.event_id))];
  const typeIds = [
    ...new Set(
      tickets
        .map((t) => t.ticket_type_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const [{ data: events }, { data: types }] = await Promise.all([
    supabase
      .from("events")
      .select("id, name, slug, event_date")
      .in("id", eventIds),
    typeIds.length > 0
      ? supabase.from("ticket_types").select("id, name").in("id", typeIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const eventsById = new Map(
    (events ?? []).map((e) => [e.id, e]),
  );
  const typesById = new Map((types ?? []).map((t) => [t.id, t]));

  return tickets.map((ticket) => {
    const event = eventsById.get(ticket.event_id);
    const type = ticket.ticket_type_id
      ? typesById.get(ticket.ticket_type_id)
      : null;

    return {
      ...(ticket as Ticket),
      event_name: event?.name ?? "Evento",
      event_slug: event?.slug ?? "",
      event_date: event?.event_date ?? "",
      ticket_type_name: type?.name ?? null,
    };
  });
}

export async function hasLinkedCommunityMember(
  profileId: string,
): Promise<boolean> {
  const memberId = await getCommunityMemberIdForProfile(profileId);
  return memberId !== null;
}

export async function getTicketsByEventIdForAdmin(
  eventId: string,
): Promise<TicketWithTypeName[]> {
  const { supabase } = await requireAdminPage();

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select(TICKET_COLUMNS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getTicketsByEventIdForAdmin:", error.message);
    return [];
  }

  if (!tickets?.length) {
    return [];
  }

  const typeIds = [
    ...new Set(
      tickets
        .map((t) => t.ticket_type_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const { data: types } =
    typeIds.length > 0
      ? await supabase.from("ticket_types").select("id, name").in("id", typeIds)
      : { data: [] as { id: string; name: string }[] };

  const typesById = new Map((types ?? []).map((t) => [t.id, t]));

  return tickets.map((ticket) => ({
    ...(ticket as Ticket),
    ticket_type_name: ticket.ticket_type_id
      ? (typesById.get(ticket.ticket_type_id)?.name ?? null)
      : null,
  }));
}

export async function getEventForAdminSales(eventId: string) {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("events")
    .select("id, name, slug, status")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getTicketByIdForAdmin(
  ticketId: string,
): Promise<Ticket | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_COLUMNS)
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Ticket;
}

export async function assertPublishedEventForReservation(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, slug, status, ticket_sale_mode")
    .eq("id", eventId)
    .eq("status", EVENT_STATUS.PUBLISHED)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}
