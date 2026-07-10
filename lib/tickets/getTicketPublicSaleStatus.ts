import type { TicketType } from "@/lib/tickets/types";
import { getStockAvailable } from "@/lib/tickets/utils";

export type TicketPublicSaleStatusKind =
  | "coming_soon"
  | "sale_active_with_end"
  | "sale_active_open"
  | "sale_ended"
  | "sold_out"
  | "unavailable";

export type TicketPublicSaleStatus = {
  kind: TicketPublicSaleStatusKind;
  badge: string;
  title: string;
  dateLabel: string | null;
  secondary: string;
};

export function formatTicketSaleStatusDate(iso: string): string {
  const formatted = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

  return formatted.replace(/\./g, "").replace(/\s+/g, " ").trim();
}

export function getTicketPublicSaleStatus(
  ticketType: TicketType,
  options?: { now?: Date },
): TicketPublicSaleStatus {
  const now = options?.now ?? new Date();

  if (!ticketType.is_active) {
    return {
      kind: "unavailable",
      badge: "NO DISPONIBLE",
      title: "Venta no disponible",
      dateLabel: null,
      secondary: "Este tipo de entrada no está a la venta",
    };
  }

  if (ticketType.sale_start_at && now < new Date(ticketType.sale_start_at)) {
    return {
      kind: "coming_soon",
      badge: "PRÓXIMAMENTE",
      title: "Inicia la venta",
      dateLabel: formatTicketSaleStatusDate(ticketType.sale_start_at),
      secondary: "Todavía no disponible",
    };
  }

  if (ticketType.sale_end_at && now > new Date(ticketType.sale_end_at)) {
    return {
      kind: "sale_ended",
      badge: "VENTA FINALIZADA",
      title: "Venta cerrada",
      dateLabel: formatTicketSaleStatusDate(ticketType.sale_end_at),
      secondary: "La venta de este tipo de entrada finalizó",
    };
  }

  const stockRemaining = getStockAvailable(ticketType);
  if (stockRemaining !== null && stockRemaining <= 0) {
    return {
      kind: "sold_out",
      badge: "AGOTADA",
      title: "Entradas agotadas",
      dateLabel: null,
      secondary: "No hay entradas disponibles por el momento",
    };
  }

  if (ticketType.sale_end_at) {
    return {
      kind: "sale_active_with_end",
      badge: "VENTA ACTIVA",
      title: "Finaliza la venta",
      dateLabel: formatTicketSaleStatusDate(ticketType.sale_end_at),
      secondary: "Disponible ahora",
    };
  }

  return {
    kind: "sale_active_open",
    badge: "VENTA ACTIVA",
    title: "Venta disponible",
    dateLabel: null,
    secondary: "Disponible ahora",
  };
}
