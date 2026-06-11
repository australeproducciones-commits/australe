import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
  type TicketStatus,
} from "@/lib/ticket-sales/types";
import type { TicketWithTypeName } from "@/lib/ticket-sales/types";
import type { TicketType } from "@/lib/tickets/types";

export type TicketTypeVentasBreakdown = {
  typeId: string | null;
  typeName: string;
  total: number;
  confirmed: number;
  revenue: number;
};

export type EventVentasDashboard = {
  totalTickets: number;
  confirmedCount: number;
  pendingReservationCount: number;
  revenueConfirmed: number;
  byStatus: Record<TicketStatus, number>;
  byType: TicketTypeVentasBreakdown[];
  stockSold: number;
  stockTotal: number | null;
  hasUndefinedStock: boolean;
  timeUntilEventLabel: string;
  eventDateLabel: string;
  isEventPast: boolean;
};

function isConfirmedSale(ticketStatus: string, paymentStatus: string): boolean {
  return (
    (ticketStatus === TICKET_STATUS.VALID ||
      ticketStatus === TICKET_STATUS.USED) &&
    paymentStatus === TICKET_PAYMENT_STATUS.CONFIRMED
  );
}

function isPendingReservation(ticketStatus: string, paymentStatus: string): boolean {
  return (
    ticketStatus === TICKET_STATUS.RESERVED &&
    paymentStatus === TICKET_PAYMENT_STATUS.PENDING
  );
}

function emptyStatusCounts(): Record<TicketStatus, number> {
  return {
    [TICKET_STATUS.RESERVED]: 0,
    [TICKET_STATUS.VALID]: 0,
    [TICKET_STATUS.USED]: 0,
    [TICKET_STATUS.CANCELLED]: 0,
    [TICKET_STATUS.EXPIRED]: 0,
  };
}

export function getEventStartDateTime(
  eventDate: string,
  startTime: string | null,
): Date {
  if (startTime) {
    const normalized = startTime.length === 5 ? `${startTime}:00` : startTime;
    return new Date(`${eventDate}T${normalized}`);
  }

  return new Date(`${eventDate}T00:00:00`);
}

export function formatTimeUntilEvent(
  eventDate: string,
  startTime: string | null,
  now: Date = new Date(),
): { label: string; isPast: boolean } {
  const start = getEventStartDateTime(eventDate, startTime);
  const diffMs = start.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { label: "El evento ya comenzó o finalizó", isPast: true };
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return {
      label: `${days} día${days === 1 ? "" : "s"}, ${hours} h`,
      isPast: false,
    };
  }

  if (hours > 0) {
    return {
      label: `${hours} h ${minutes} min`,
      isPast: false,
    };
  }

  return {
    label: `${minutes} minuto${minutes === 1 ? "" : "s"}`,
    isPast: false,
  };
}

export function buildEventVentasDashboard(
  tickets: TicketWithTypeName[],
  ticketTypes: TicketType[],
  eventDate: string,
  startTime: string | null,
  eventDateLabel: string,
): EventVentasDashboard {
  const byStatus = emptyStatusCounts();
  const typeMap = new Map<string, TicketTypeVentasBreakdown>();

  let confirmedCount = 0;
  let pendingReservationCount = 0;
  let revenueConfirmed = 0;

  for (const ticket of tickets) {
    const status = ticket.ticket_status as TicketStatus;
    if (status in byStatus) {
      byStatus[status] += 1;
    }

    if (isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      confirmedCount += 1;
      revenueConfirmed += Number(ticket.price_paid) || 0;
    }

    if (isPendingReservation(ticket.ticket_status, ticket.payment_status)) {
      pendingReservationCount += 1;
    }

    const typeKey = ticket.ticket_type_id ?? "unknown";
    const existing = typeMap.get(typeKey) ?? {
      typeId: ticket.ticket_type_id,
      typeName: ticket.ticket_type_name ?? "Sin tipo",
      total: 0,
      confirmed: 0,
      revenue: 0,
    };

    existing.total += 1;

    if (isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      existing.confirmed += 1;
      existing.revenue += Number(ticket.price_paid) || 0;
    }

    typeMap.set(typeKey, existing);
  }

  for (const ticketType of ticketTypes) {
    if (!typeMap.has(ticketType.id)) {
      typeMap.set(ticketType.id, {
        typeId: ticketType.id,
        typeName: ticketType.name,
        total: 0,
        confirmed: 0,
        revenue: 0,
      });
    }
  }

  let stockTotal: number | null = 0;
  let hasUndefinedStock = false;
  let stockSold = 0;

  for (const ticketType of ticketTypes) {
    stockSold += ticketType.stock_sold;

    if (ticketType.stock_total === null) {
      hasUndefinedStock = true;
      continue;
    }

    stockTotal = (stockTotal ?? 0) + ticketType.stock_total;
  }

  if (hasUndefinedStock && ticketTypes.every((t) => t.stock_total === null)) {
    stockTotal = null;
  } else if (hasUndefinedStock) {
    stockTotal = stockTotal;
  }

  const { label: timeUntilEventLabel, isPast: isEventPast } =
    formatTimeUntilEvent(eventDate, startTime);

  const byType = [...typeMap.values()].sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }

    return a.typeName.localeCompare(b.typeName, "es");
  });

  return {
    totalTickets: tickets.length,
    confirmedCount,
    pendingReservationCount,
    revenueConfirmed,
    byStatus,
    byType,
    stockSold,
    stockTotal: hasUndefinedStock && stockTotal === 0 ? null : stockTotal,
    hasUndefinedStock,
    timeUntilEventLabel,
    eventDateLabel,
    isEventPast,
  };
}

export const VENTAS_STATUS_ORDER: TicketStatus[] = [
  TICKET_STATUS.RESERVED,
  TICKET_STATUS.VALID,
  TICKET_STATUS.USED,
  TICKET_STATUS.CANCELLED,
  TICKET_STATUS.EXPIRED,
];
