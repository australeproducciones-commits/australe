import {
  isPendingReservation,
} from "@/lib/ticket-sales/saleStatus";
import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
} from "@/lib/ticket-sales/types";
import { KIOSK_ORDER_PAYMENT_STATUS } from "@/lib/kiosk/types";
import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { requireAdminPage } from "@/lib/events/queries";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { isReservationExpired } from "@/lib/ticket-sales/utils";

export type PendingSaleUrgency =
  | "recent"
  | "expiring"
  | "expired";

export type PendingSaleItem = {
  id: string;
  type: "ticket" | "kiosk";
  eventId: string;
  eventName: string;
  eventSlug: string;
  amount: number;
  ticketCount: number;
  createdAt: string;
  expiresAt: string | null;
  paymentMethod: string;
  urgency: PendingSaleUrgency;
  buyerLabel: string;
  href: string;
};

export type PendingSalesSummary = {
  totalOperations: number;
  totalTickets: number;
  totalAmount: number;
  byEvent: Map<string, number>;
  items: PendingSaleItem[];
};

function ticketUrgency(
  expiresAt: string | null,
  createdAt: string,
): PendingSaleUrgency {
  if (expiresAt && isReservationExpired(expiresAt)) {
    return "expired";
  }

  if (expiresAt) {
    const hoursLeft =
      (new Date(expiresAt).getTime() - Date.now()) / 3_600_000;
    if (hoursLeft <= 24) {
      return "expiring";
    }
  }

  const hoursSince =
    (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (hoursSince >= 48) {
    return "expiring";
  }

  return "recent";
}

const URGENCY_ORDER: Record<PendingSaleUrgency, number> = {
  expired: 0,
  expiring: 1,
  recent: 2,
};

export async function getPendingSalesSummary(): Promise<PendingSalesSummary> {
  const { supabase } = await requireAdminPage();

  const [{ data: tickets }, { data: kioskOrders }, { data: events }] =
    await Promise.all([
      supabase
        .from("tickets")
        .select(
          "id, event_id, ticket_status, payment_status, price_paid, payment_method, reservation_expires_at, buyer_name, created_at",
        )
        .eq("ticket_status", TICKET_STATUS.RESERVED)
        .eq("payment_status", TICKET_PAYMENT_STATUS.PENDING),
      supabase
        .from("kiosk_orders")
        .select(
          "id, event_id, payment_status, total_amount, buyer_name, created_at",
        )
        .eq("payment_status", KIOSK_ORDER_PAYMENT_STATUS.PENDING),
      supabase.from("events").select("id, name, slug"),
    ]);

  const eventMap = new Map(
    (events ?? []).map((e) => [e.id, e as { id: string; name: string; slug: string }]),
  );

  const items: PendingSaleItem[] = [];

  for (const ticket of tickets ?? []) {
    if (
      !isPendingReservation(ticket.ticket_status, ticket.payment_status)
    ) {
      continue;
    }

    const event = eventMap.get(ticket.event_id);
    if (!event) {
      continue;
    }

    items.push({
      id: ticket.id,
      type: "ticket",
      eventId: ticket.event_id,
      eventName: event.name,
      eventSlug: event.slug,
      amount: Number(ticket.price_paid) || 0,
      ticketCount: 1,
      createdAt: ticket.created_at,
      expiresAt: ticket.reservation_expires_at,
      paymentMethod: ticket.payment_method,
      urgency: ticketUrgency(
        ticket.reservation_expires_at,
        ticket.created_at,
      ),
      buyerLabel: ticket.buyer_name,
      href: `${ROUTES.adminEventoVentas(ticket.event_id)}?estado=pendiente`,
    });
  }

  for (const order of kioskOrders ?? []) {
    const event = eventMap.get(order.event_id);
    if (!event) {
      continue;
    }

    items.push({
      id: order.id,
      type: "kiosk",
      eventId: order.event_id,
      eventName: event.name,
      eventSlug: event.slug,
      amount: Number(order.total_amount) || 0,
      ticketCount: 0,
      createdAt: order.created_at,
      expiresAt: null,
      paymentMethod: "pending",
      urgency: ticketUrgency(null, order.created_at),
      buyerLabel: order.buyer_name,
      href: ROUTES.adminEventoKiosco(order.event_id),
    });
  }

  items.sort((a, b) => {
    const urgencyCmp = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (urgencyCmp !== 0) {
      return urgencyCmp;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const byEvent = new Map<string, number>();
  let totalTickets = 0;
  let totalAmount = 0;

  for (const item of items) {
    totalAmount += item.amount;
    totalTickets += item.ticketCount;
    byEvent.set(item.eventId, (byEvent.get(item.eventId) ?? 0) + 1);
  }

  return {
    totalOperations: items.length,
    totalTickets,
    totalAmount,
    byEvent,
    items,
  };
}

export async function getPendingSalesCount(): Promise<number> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return 0;
  }

  try {
    const summary = await getPendingSalesSummary();
    return summary.totalOperations;
  } catch {
    return 0;
  }
}
