"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import type { TicketType } from "@/lib/tickets/types";
import {
  assertPublishedEventForReservation,
  getPublishedEventReservationContext,
  getTicketByIdForAdmin,
  getTicketTypeForReservation,
} from "@/lib/ticket-sales/queries";
import type {
  ReservationActionResult,
  TicketAdminActionResult,
} from "@/lib/ticket-sales/types";
import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
} from "@/lib/ticket-sales/types";
import {
  canMarkTicketExpired,
  getReservationExpiresAt,
  isInternalSaleEnabled,
  isTicketTypeOnSale,
  mapCancelTicketRpcError,
  mapReserveTicketsRpcError,
  parseReservationBuyer,
  parseReservationLines,
  validateReservationBuyer,
  validateReservationLines,
} from "@/lib/ticket-sales/utils";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireReservationActor() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || !profile.is_active) {
    return {
      error: "Iniciá sesión con una cuenta de cliente para reservar entradas.",
    } as const;
  }

  if (
    profile.role === ROLES.CASHIER ||
    profile.role === ROLES.DOOR
  ) {
    return {
      error: "Tu cuenta no puede reservar entradas desde la web.",
    } as const;
  }

  return { supabase, profile } as const;
}

async function requireAdminAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return { error: "No tenés permiso para realizar esta acción." as const };
  }

  return { supabase, profile };
}

function revalidateReservationPaths(eventSlug: string, eventId: string) {
  revalidatePath(ROUTES.evento(eventSlug));
  revalidatePath(ROUTES.eventoEntradas(eventSlug));
  revalidatePath(ROUTES.adminEventoVentas(eventId));
  revalidatePath(ROUTES.adminEventoEntradas(eventId));
  revalidatePath(ROUTES.miCuentaEntradas);
}

export async function reserveTicketsAction(
  eventSlug: string,
  formData: FormData,
): Promise<ReservationActionResult> {
  const auth = await requireReservationActor();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const context = await getPublishedEventReservationContext(eventSlug);

  if (!context) {
    return { success: false, error: "Evento no encontrado o no publicado." };
  }

  const { event } = context;

  if (!isInternalSaleEnabled(event.ticket_sale_mode)) {
    return {
      success: false,
      error: "La venta interna no está habilitada para este evento.",
    };
  }

  const buyer = parseReservationBuyer(formData);
  const buyerError = validateReservationBuyer(buyer);

  if (buyerError) {
    return { success: false, error: buyerError };
  }

  const ticketTypeIds = context.ticketTypes.map((t) => t.id);
  const lines = parseReservationLines(formData, ticketTypeIds);
  const freshTypes = new Map<string, TicketType>();

  for (const line of lines) {
    const ticketType = await getTicketTypeForReservation(
      line.ticketTypeId,
      event.id,
    );

    if (!ticketType || !isTicketTypeOnSale(ticketType)) {
      return {
        success: false,
        error: "Uno de los tipos de entrada ya no está disponible.",
      };
    }

    freshTypes.set(line.ticketTypeId, ticketType);
  }

  const linesError = validateReservationLines(lines, freshTypes);

  if (linesError) {
    return { success: false, error: linesError };
  }

  let totalTickets = 0;
  let reservationExpiresAt: string | undefined;

  for (const line of lines) {
    const { data, error } = await auth.supabase.rpc("reserve_tickets", {
      p_event_id: event.id,
      p_ticket_type_id: line.ticketTypeId,
      p_quantity: line.quantity,
      p_buyer_name: buyer.buyer_name,
      p_buyer_whatsapp: buyer.buyer_whatsapp || null,
      p_buyer_dni: buyer.buyer_dni || null,
    });

    if (error) {
      console.error("reserveTicketsAction rpc:", error.message);
      return {
        success: false,
        error: mapReserveTicketsRpcError(error.message),
      };
    }

    const tickets = data ?? [];
    totalTickets += tickets.length;

    if (!reservationExpiresAt && tickets[0]?.reservation_expires_at) {
      reservationExpiresAt = tickets[0].reservation_expires_at;
    }
  }

  revalidateReservationPaths(event.slug, event.id);

  return {
    success: true,
    ticketCount: totalTickets,
    reservationExpiresAt: reservationExpiresAt ?? getReservationExpiresAt(),
  };
}

export async function reserveTicketsFormAction(
  eventSlug: string,
  _prevState: ReservationActionResult,
  formData: FormData,
): Promise<ReservationActionResult> {
  return reserveTicketsAction(eventSlug, formData);
}

export async function confirmTicketPaymentAction(
  ticketId: string,
): Promise<TicketAdminActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const ticket = await getTicketByIdForAdmin(ticketId);

  if (!ticket) {
    return { success: false, error: "Entrada no encontrada." };
  }

  if (
    ticket.payment_status !== TICKET_PAYMENT_STATUS.PENDING ||
    ticket.ticket_status !== TICKET_STATUS.RESERVED
  ) {
    return {
      success: false,
      error: "Solo se pueden confirmar reservas pendientes.",
    };
  }

  const { error } = await auth.supabase
    .from("tickets")
    .update({
      payment_status: TICKET_PAYMENT_STATUS.CONFIRMED,
      ticket_status: TICKET_STATUS.VALID,
    })
    .eq("id", ticketId);

  if (error) {
    return { success: false, error: "No se pudo confirmar el pago." };
  }

  const event = await assertPublishedEventForReservation(ticket.event_id);
  if (event) {
    revalidateReservationPaths(event.slug, ticket.event_id);
  } else {
    revalidatePath(ROUTES.adminEventoVentas(ticket.event_id));
    revalidatePath(ROUTES.miCuentaEntradas);
  }

  return { success: true };
}

export async function cancelTicketAction(
  ticketId: string,
  reason: string,
): Promise<TicketAdminActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const trimmedReason = reason.trim() || null;

  const { data, error } = await auth.supabase.rpc("cancel_ticket", {
    p_ticket_id: ticketId,
    p_cancel_reason: trimmedReason,
    p_mark_as_expired: false,
  });

  if (error) {
    console.error("cancelTicketAction rpc:", error.message);
    return {
      success: false,
      error: mapCancelTicketRpcError(error.message),
    };
  }

  if (data?.event_id) {
    const event = await assertPublishedEventForReservation(data.event_id);
    if (event) {
      revalidateReservationPaths(event.slug, data.event_id);
    } else {
      revalidatePath(ROUTES.adminEventoVentas(data.event_id));
      revalidatePath(ROUTES.adminEventoEntradas(data.event_id));
      revalidatePath(ROUTES.miCuentaEntradas);
    }
  }

  return { success: true };
}

export async function markTicketExpiredAction(
  ticketId: string,
): Promise<TicketAdminActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const ticket = await getTicketByIdForAdmin(ticketId);

  if (!ticket) {
    return { success: false, error: "Entrada no encontrada." };
  }

  if (!canMarkTicketExpired(ticket)) {
    return {
      success: false,
      error: "Esta reserva no está vencida o ya fue procesada.",
    };
  }

  const { data, error } = await auth.supabase.rpc("cancel_ticket", {
    p_ticket_id: ticketId,
    p_cancel_reason: "Reserva vencida",
    p_mark_as_expired: true,
  });

  if (error) {
    console.error("markTicketExpiredAction rpc:", error.message);
    return {
      success: false,
      error: mapCancelTicketRpcError(error.message),
    };
  }

  if (data?.event_id) {
    const event = await assertPublishedEventForReservation(data.event_id);
    if (event) {
      revalidateReservationPaths(event.slug, data.event_id);
    } else {
      revalidatePath(ROUTES.adminEventoVentas(data.event_id));
      revalidatePath(ROUTES.adminEventoEntradas(data.event_id));
    }
  }

  return { success: true };
}
