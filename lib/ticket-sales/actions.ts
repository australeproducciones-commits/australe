"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import type { TicketType } from "@/lib/tickets/types";
import { getStockAvailable } from "@/lib/tickets/utils";
import {
  assertPublishedEventForReservation,
  getCommunityMemberIdForProfile,
  getPublishedEventReservationContext,
  getTicketByIdForAdmin,
  getTicketTypeForReservation,
} from "@/lib/ticket-sales/queries";
import type {
  ReservationActionResult,
  TicketAdminActionResult,
} from "@/lib/ticket-sales/types";
import {
  SALES_CHANNEL,
  TICKET_PAYMENT_METHOD,
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
} from "@/lib/ticket-sales/types";
import {
  canMarkTicketExpired,
  generateQrToken,
  getReservationExpiresAt,
  isInternalSaleEnabled,
  isTicketTypeOnSale,
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

async function incrementStockSold(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ticketType: TicketType,
  quantity: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const available = getStockAvailable(ticketType);

  if (available !== null && quantity > available) {
    return {
      ok: false,
      error: `Solo quedan ${available} entradas "${ticketType.name}" disponibles.`,
    };
  }

  const newStockSold = ticketType.stock_sold + quantity;

  const { data, error } = await supabase
    .from("ticket_types")
    .update({ stock_sold: newStockSold })
    .eq("id", ticketType.id)
    .eq("stock_sold", ticketType.stock_sold)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: `No se pudo actualizar el stock de "${ticketType.name}". Intentá de nuevo.`,
    };
  }

  return { ok: true };
}

async function decrementStockSold(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ticketTypeId: string,
  quantity: number,
): Promise<void> {
  const { data } = await supabase
    .from("ticket_types")
    .select("stock_sold")
    .eq("id", ticketTypeId)
    .maybeSingle();

  if (!data) {
    return;
  }

  const nextSold = Math.max(0, data.stock_sold - quantity);

  await supabase
    .from("ticket_types")
    .update({ stock_sold: nextSold })
    .eq("id", ticketTypeId);
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

  const communityMemberId = await getCommunityMemberIdForProfile(
    auth.profile.id,
  );
  const reservationExpiresAt = getReservationExpiresAt();
  const isAdmin = auth.profile.role === ROLES.ADMIN;
  let totalTickets = 0;

  for (const line of lines) {
    const ticketType = freshTypes.get(line.ticketTypeId)!;

    if (isAdmin) {
      const stockResult = await incrementStockSold(
        auth.supabase,
        ticketType,
        line.quantity,
      );

      if (!stockResult.ok) {
        return { success: false, error: stockResult.error };
      }

      ticketType.stock_sold += line.quantity;
    }

    const inserts = Array.from({ length: line.quantity }, () => ({
      event_id: event.id,
      ticket_type_id: ticketType.id,
      community_member_id: communityMemberId,
      buyer_name: buyer.buyer_name,
      buyer_whatsapp: buyer.buyer_whatsapp || null,
      buyer_dni: buyer.buyer_dni || null,
      qr_token: generateQrToken(),
      price_paid: ticketType.public_price,
      original_price: ticketType.public_price,
      discount_amount: 0,
      payment_method: TICKET_PAYMENT_METHOD.PENDING,
      payment_status: TICKET_PAYMENT_STATUS.PENDING,
      ticket_status: TICKET_STATUS.RESERVED,
      sales_channel: SALES_CHANNEL.WEB,
      reservation_expires_at: reservationExpiresAt,
    }));

    const { error } = await auth.supabase.from("tickets").insert(inserts);

    if (error) {
      console.error("reserveTicketsAction insert:", error.message);

      if (isAdmin) {
        await decrementStockSold(
          auth.supabase,
          ticketType.id,
          line.quantity,
        );
      }

      return {
        success: false,
        error:
          auth.profile.role === ROLES.CUSTOMER
            ? "No se pudo crear la reserva. Verificá que tu cuenta sea de cliente."
            : "No se pudo crear la reserva. Intentá de nuevo.",
      };
    }

    if (!isAdmin) {
      const stockResult = await incrementStockSold(
        auth.supabase,
        ticketType,
        line.quantity,
      );

      if (!stockResult.ok) {
        console.warn(
          "reserveTicketsAction: stock_sold no actualizado (RLS).",
          ticketType.id,
        );
      }
    }

    totalTickets += line.quantity;
  }

  revalidateReservationPaths(event.slug, event.id);

  return {
    success: true,
    ticketCount: totalTickets,
    reservationExpiresAt,
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

  const ticket = await getTicketByIdForAdmin(ticketId);

  if (!ticket) {
    return { success: false, error: "Entrada no encontrada." };
  }

  if (
    ticket.ticket_status === TICKET_STATUS.CANCELLED ||
    ticket.ticket_status === TICKET_STATUS.USED
  ) {
    return {
      success: false,
      error: "Esta entrada ya no se puede cancelar.",
    };
  }

  const trimmedReason = reason.trim() || "Cancelada por administración";

  const { error } = await auth.supabase
    .from("tickets")
    .update({
      payment_status: TICKET_PAYMENT_STATUS.CANCELLED,
      ticket_status: TICKET_STATUS.CANCELLED,
      cancel_reason: trimmedReason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: auth.profile.id,
    })
    .eq("id", ticketId);

  if (error) {
    return { success: false, error: "No se pudo cancelar la entrada." };
  }

  if (
    ticket.ticket_status === TICKET_STATUS.RESERVED &&
    ticket.ticket_type_id
  ) {
    await decrementStockSold(auth.supabase, ticket.ticket_type_id, 1);
  }

  const event = await assertPublishedEventForReservation(ticket.event_id);
  if (event) {
    revalidateReservationPaths(event.slug, ticket.event_id);
  } else {
    revalidatePath(ROUTES.adminEventoVentas(ticket.event_id));
    revalidatePath(ROUTES.adminEventoEntradas(ticket.event_id));
    revalidatePath(ROUTES.miCuentaEntradas);
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

  const { error } = await auth.supabase
    .from("tickets")
    .update({
      ticket_status: TICKET_STATUS.EXPIRED,
      payment_status: TICKET_PAYMENT_STATUS.CANCELLED,
      cancel_reason: "Reserva vencida (24 h)",
      cancelled_at: new Date().toISOString(),
      cancelled_by: auth.profile.id,
    })
    .eq("id", ticketId);

  if (error) {
    return { success: false, error: "No se pudo marcar como vencida." };
  }

  if (ticket.ticket_type_id) {
    await decrementStockSold(auth.supabase, ticket.ticket_type_id, 1);
  }

  const event = await assertPublishedEventForReservation(ticket.event_id);
  if (event) {
    revalidateReservationPaths(event.slug, ticket.event_id);
  } else {
    revalidatePath(ROUTES.adminEventoVentas(ticket.event_id));
    revalidatePath(ROUTES.adminEventoEntradas(ticket.event_id));
  }

  return { success: true };
}
