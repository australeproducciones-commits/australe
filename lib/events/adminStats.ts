import { requireAdminPage } from "@/lib/events/queries";
import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
} from "@/lib/ticket-sales/types";

export type EventAdminStats = {
  visits: number;
  soldCount: number;
  stockTotal: number | null;
  hasUndefinedStock: boolean;
  revenue: number;
};

const EMPTY_STATS: EventAdminStats = {
  visits: 0,
  soldCount: 0,
  stockTotal: null,
  hasUndefinedStock: false,
  revenue: 0,
};

function isSoldTicket(ticketStatus: string, paymentStatus: string): boolean {
  return (
    (ticketStatus === TICKET_STATUS.VALID ||
      ticketStatus === TICKET_STATUS.USED) &&
    paymentStatus === TICKET_PAYMENT_STATUS.CONFIRMED
  );
}

export async function getAdminStatsByEventIds(
  eventIds: string[],
): Promise<Map<string, EventAdminStats>> {
  const result = new Map<string, EventAdminStats>();

  if (eventIds.length === 0) {
    return result;
  }

  for (const id of eventIds) {
    result.set(id, { ...EMPTY_STATS });
  }

  const { supabase } = await requireAdminPage();

  const [{ data: ticketTypes }, { data: tickets }] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("event_id, stock_total")
      .in("event_id", eventIds),
    supabase
      .from("tickets")
      .select("event_id, ticket_status, payment_status, price_paid")
      .in("event_id", eventIds),
  ]);

  for (const row of ticketTypes ?? []) {
    const stats = result.get(row.event_id);
    if (!stats) {
      continue;
    }

    if (row.stock_total === null) {
      stats.hasUndefinedStock = true;
      continue;
    }

    stats.stockTotal = (stats.stockTotal ?? 0) + row.stock_total;
  }

  for (const ticket of tickets ?? []) {
    const stats = result.get(ticket.event_id);
    if (!stats) {
      continue;
    }

    if (isSoldTicket(ticket.ticket_status, ticket.payment_status)) {
      stats.soldCount += 1;
      stats.revenue += Number(ticket.price_paid) || 0;
    }
  }

  return result;
}

export function formatEventSoldStockLabel(stats: EventAdminStats): string {
  if (stats.hasUndefinedStock && stats.stockTotal === null) {
    return stats.soldCount > 0
      ? `${stats.soldCount} vendidas · Sin stock definido`
      : "Sin stock definido";
  }

  if (stats.stockTotal === null) {
    return `${stats.soldCount} vendidas`;
  }

  return `${stats.soldCount} / ${stats.stockTotal} vendidas`;
}
