import type { Event } from "@/lib/events/types";
import { resolveSaleChannels, getValidExternalTicketUrl } from "@/lib/events/saleChannels";
import type { TicketType } from "@/lib/tickets/types";
import { LAST_TICKETS_THRESHOLD } from "@/lib/tickets/publicDisplay";
import { getStockAvailable } from "@/lib/tickets/utils";

export type EventMerchandisingContext = {
  event: Pick<
    Event,
    | "status"
    | "sale_web_enabled"
    | "external_sale_enabled"
    | "reservation_enabled"
    | "external_ticket_url"
  >;
  ticketTypes: TicketType[];
  minCommunityPrice: number | null;
  kioskPresaleEnabled?: boolean;
};

export type EventMerchandisingBadge = {
  label: string;
  tone: "primary" | "community" | "warning" | "success" | "neutral";
};

export function getMinCommunityPrice(ticketTypes: TicketType[]): number | null {
  const prices = ticketTypes
    .filter((ticket) => ticket.is_active && ticket.community_price > 0)
    .map((ticket) => ticket.community_price);

  if (prices.length === 0) {
    return null;
  }

  return Math.min(...prices);
}

export function getTotalTicketsRemaining(ticketTypes: TicketType[]): number | null {
  const active = ticketTypes.filter((ticket) => ticket.is_active);
  const withStock = active.filter((ticket) => ticket.stock_total !== null);

  if (withStock.length === 0) {
    return null;
  }

  return withStock.reduce((sum, ticket) => {
    const remaining = getStockAvailable(ticket);
    return sum + (remaining ?? 0);
  }, 0);
}

export function hasLowTicketStock(ticketTypes: TicketType[]): boolean {
  return ticketTypes.some((ticket) => {
    if (!ticket.is_active) {
      return false;
    }

    const remaining = getStockAvailable(ticket);
    return (
      remaining !== null &&
      remaining > 0 &&
      remaining <= LAST_TICKETS_THRESHOLD
    );
  });
}

export function getEventMerchandisingBadges(
  context: EventMerchandisingContext,
): EventMerchandisingBadge[] {
  const badges: EventMerchandisingBadge[] = [];
  const channels = resolveSaleChannels(context.event);
  const externalUrl = getValidExternalTicketUrl(context.event);

  if (context.kioskPresaleEnabled) {
    badges.push({ label: "Preventa de consumiciones", tone: "primary" });
  }

  if (channels.reservationEnabled && context.ticketTypes.some((t) => t.is_active)) {
    badges.push({ label: "Reserva disponible", tone: "neutral" });
  }

  if (channels.saleWebEnabled && context.ticketTypes.some((t) => t.is_active)) {
    badges.push({ label: "Entradas disponibles", tone: "success" });
  }

  if (channels.externalSaleEnabled && externalUrl) {
    badges.push({ label: "Venta en sitio externo", tone: "neutral" });
  }

  if (context.minCommunityPrice != null) {
    badges.push({ label: "Precio especial comunidad", tone: "community" });
  }

  if (hasLowTicketStock(context.ticketTypes)) {
    badges.push({ label: "Últimas entradas", tone: "warning" });
  }

  const totalRemaining = getTotalTicketsRemaining(context.ticketTypes);
  if (
    totalRemaining !== null &&
    totalRemaining > 0 &&
    totalRemaining <= LAST_TICKETS_THRESHOLD &&
    !badges.some((badge) => badge.label === "Últimas entradas")
  ) {
    badges.push({ label: "Cupos limitados", tone: "warning" });
  }

  return badges;
}
