import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
} from "@/lib/ticket-sales/types";

/** Venta confirmada: entradas válidas o usadas con pago confirmado. */
export function isConfirmedSale(
  ticketStatus: string,
  paymentStatus: string,
): boolean {
  return (
    (ticketStatus === TICKET_STATUS.VALID ||
      ticketStatus === TICKET_STATUS.USED) &&
    paymentStatus === TICKET_PAYMENT_STATUS.CONFIRMED
  );
}

/** Reserva pendiente de confirmación de pago. */
export function isPendingReservation(
  ticketStatus: string,
  paymentStatus: string,
): boolean {
  return (
    ticketStatus === TICKET_STATUS.RESERVED &&
    paymentStatus === TICKET_PAYMENT_STATUS.PENDING
  );
}

/** Entrada cancelada o vencida (no cuenta como vendida ni recaudación). */
export function isCancelledOrExpiredTicket(
  ticketStatus: string,
  paymentStatus: string,
): boolean {
  return (
    ticketStatus === TICKET_STATUS.CANCELLED ||
    ticketStatus === TICKET_STATUS.EXPIRED ||
    paymentStatus === TICKET_PAYMENT_STATUS.CANCELLED ||
    paymentStatus === TICKET_PAYMENT_STATUS.REJECTED
  );
}
