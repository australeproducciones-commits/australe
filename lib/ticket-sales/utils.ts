import { randomUUID } from "crypto";
import { TICKET_SALE_MODE } from "@/lib/constants/event-status";
import type { TicketType } from "@/lib/tickets/types";
import { getStockAvailable } from "@/lib/tickets/utils";
import type {
  CustomerTicket,
  ReservationBuyerInput,
  ReservationLineInput,
  TicketPaymentStatus,
  TicketStatus,
  SalesChannel,
} from "@/lib/ticket-sales/types";
import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
  SALES_CHANNEL,
} from "@/lib/ticket-sales/types";

const RESERVATION_HOURS = 24;

export const TICKET_PAYMENT_STATUS_LABELS: Record<TicketPaymentStatus, string> = {
  [TICKET_PAYMENT_STATUS.PENDING]: "Pendiente",
  [TICKET_PAYMENT_STATUS.CONFIRMED]: "Confirmado",
  [TICKET_PAYMENT_STATUS.REJECTED]: "Rechazado",
  [TICKET_PAYMENT_STATUS.REFUNDED]: "Reembolsado",
  [TICKET_PAYMENT_STATUS.CANCELLED]: "Cancelado",
};

export const CUSTOMER_TICKET_SECTIONS: {
  status: TicketStatus;
  label: string;
  description: string;
}[] = [
  {
    status: TICKET_STATUS.VALID,
    label: "Entradas válidas",
    description: "Confirmadas y listas para presentar en puerta.",
  },
  {
    status: TICKET_STATUS.RESERVED,
    label: "Reservas pendientes",
    description: "Aguardando confirmación de pago.",
  },
  {
    status: TICKET_STATUS.USED,
    label: "Entradas usadas",
    description: "Ya ingresaste con esta entrada.",
  },
  {
    status: TICKET_STATUS.CANCELLED,
    label: "Canceladas",
    description: "Reservas o entradas canceladas.",
  },
  {
    status: TICKET_STATUS.EXPIRED,
    label: "Vencidas",
    description: "La reserva expiró sin confirmación de pago.",
  },
];

export function groupCustomerTicketsByStatus(tickets: CustomerTicket[]) {
  return CUSTOMER_TICKET_SECTIONS.map((section) => ({
    ...section,
    tickets: tickets.filter((ticket) => ticket.ticket_status === section.status),
  })).filter((section) => section.tickets.length > 0);
}

export function shouldShowTicketQr(ticketStatus: TicketStatus): boolean {
  return (
    ticketStatus === TICKET_STATUS.VALID ||
    ticketStatus === TICKET_STATUS.RESERVED
  );
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  [TICKET_STATUS.RESERVED]: "Reservada",
  [TICKET_STATUS.VALID]: "Válida",
  [TICKET_STATUS.USED]: "Usada",
  [TICKET_STATUS.CANCELLED]: "Cancelada",
  [TICKET_STATUS.EXPIRED]: "Vencida",
};

export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  [SALES_CHANNEL.WEB]: "Web",
  [SALES_CHANNEL.ADMIN_MANUAL]: "Admin manual",
  [SALES_CHANNEL.DOOR]: "Puerta",
  [SALES_CHANNEL.EXTERNAL]: "Externo",
  [SALES_CHANNEL.COURTESY]: "Cortesía",
};

export function isInternalSaleEnabled(ticketSaleMode: string): boolean {
  return (
    ticketSaleMode === TICKET_SALE_MODE.INTERNAL ||
    ticketSaleMode === TICKET_SALE_MODE.BOTH
  );
}

export function isTicketTypeOnSale(
  ticketType: TicketType,
  now: Date = new Date(),
): boolean {
  if (!ticketType.is_active) {
    return false;
  }

  if (ticketType.sale_start_at) {
    const start = new Date(ticketType.sale_start_at);
    if (now < start) {
      return false;
    }
  }

  if (ticketType.sale_end_at) {
    const end = new Date(ticketType.sale_end_at);
    if (now > end) {
      return false;
    }
  }

  const available = getStockAvailable(ticketType);
  if (available !== null && available <= 0) {
    return false;
  }

  return true;
}

export function filterTicketTypesOnSale(ticketTypes: TicketType[]): TicketType[] {
  return ticketTypes.filter((ticketType) => isTicketTypeOnSale(ticketType));
}

export function generateQrToken(): string {
  return `aus-${randomUUID()}`;
}

export function getReservationExpiresAt(
  from: Date = new Date(),
): string {
  return new Date(
    from.getTime() + RESERVATION_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

export function parseReservationBuyer(formData: FormData): ReservationBuyerInput {
  return {
    buyer_name: String(formData.get("buyer_name") ?? "").trim(),
    buyer_whatsapp: String(formData.get("buyer_whatsapp") ?? "").trim(),
    buyer_dni: String(formData.get("buyer_dni") ?? "").trim(),
  };
}

export function parseReservationLines(
  formData: FormData,
  ticketTypeIds: string[],
): ReservationLineInput[] {
  return ticketTypeIds
    .map((ticketTypeId) => {
      const raw = String(formData.get(`qty_${ticketTypeId}`) ?? "0").trim();
      const quantity = Number.parseInt(raw, 10);
      return {
        ticketTypeId,
        quantity: Number.isNaN(quantity) ? 0 : quantity,
      };
    })
    .filter((line) => line.quantity > 0);
}

export function validateReservationBuyer(
  buyer: ReservationBuyerInput,
): string | null {
  if (!buyer.buyer_name) {
    return "El nombre del comprador es obligatorio.";
  }

  return null;
}

export function validateReservationLines(
  lines: ReservationLineInput[],
  ticketTypesById: Map<string, TicketType>,
): string | null {
  if (lines.length === 0) {
    return "Seleccioná al menos una entrada.";
  }

  for (const line of lines) {
    const ticketType = ticketTypesById.get(line.ticketTypeId);

    if (!ticketType || !ticketType.is_active) {
      return "Uno de los tipos de entrada ya no está disponible.";
    }

    if (!isTicketTypeOnSale(ticketType)) {
      return `Las entradas "${ticketType.name}" no están a la venta en este momento.`;
    }

    if (line.quantity <= 0) {
      return "La cantidad debe ser mayor a 0.";
    }

    if (line.quantity > ticketType.max_per_order) {
      return `Máximo ${ticketType.max_per_order} entradas "${ticketType.name}" por reserva.`;
    }

    const available = getStockAvailable(ticketType);
    if (available !== null && line.quantity > available) {
      return `Solo quedan ${available} entradas "${ticketType.name}" disponibles.`;
    }
  }

  return null;
}

export function formatReservationExpiry(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function isReservationExpired(
  reservationExpiresAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!reservationExpiresAt) {
    return false;
  }

  return new Date(reservationExpiresAt) < now;
}

export function mapCancelTicketRpcError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("usuario no autenticado")) {
    return "Tenés que iniciar sesión para realizar esta acción.";
  }
  if (normalized.includes("solo administradores pueden cancelar")) {
    return "Solo los administradores pueden cancelar entradas.";
  }
  if (normalized.includes("entrada no encontrada")) {
    return "Entrada no encontrada.";
  }
  if (normalized.includes("la entrada ya fue usada")) {
    return "Esta entrada ya fue usada y no se puede cancelar.";
  }
  if (normalized.includes("la entrada ya fue cancelada o vencida")) {
    return "Esta entrada ya fue cancelada o vencida.";
  }
  if (normalized.includes("no se pudo liberar stock")) {
    return "No se pudo liberar el stock de la entrada.";
  }

  return "No se pudo cancelar la entrada. Intentá de nuevo.";
}

export function mapReserveTicketsRpcError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("usuario no autenticado")) {
    return "Tenés que iniciar sesión para reservar entradas.";
  }
  if (normalized.includes("cantidad inválida")) {
    return "La cantidad seleccionada no es válida.";
  }
  if (normalized.includes("comprador requerido")) {
    return "Ingresá el nombre del comprador.";
  }
  if (normalized.includes("evento no disponible")) {
    return "Este evento no está disponible para reservas.";
  }
  if (normalized.includes("venta interna no habilitada")) {
    return "Este evento no tiene venta interna habilitada.";
  }
  if (normalized.includes("tipo de entrada no disponible")) {
    return "Este tipo de entrada no está disponible.";
  }
  if (normalized.includes("venta fuera de fecha")) {
    return "La venta de esta entrada está fuera de fecha.";
  }
  if (normalized.includes("supera máximo por compra")) {
    return "La cantidad supera el máximo permitido por compra.";
  }
  if (normalized.includes("stock insuficiente")) {
    return "No hay stock suficiente para esa cantidad.";
  }

  return "No se pudo crear la reserva. Intentá de nuevo.";
}

export function canMarkTicketExpired(ticket: {
  ticket_status: TicketStatus;
  payment_status: TicketPaymentStatus;
  reservation_expires_at: string | null;
}): boolean {
  return (
    ticket.ticket_status === TICKET_STATUS.RESERVED &&
    ticket.payment_status === TICKET_PAYMENT_STATUS.PENDING &&
    isReservationExpired(ticket.reservation_expires_at)
  );
}
