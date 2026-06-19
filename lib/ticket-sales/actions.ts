"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { requireActiveProfile, requireAdmin } from "@/lib/auth/require";
import { resolveEventPublicAccess } from "@/lib/events/access";
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
  TicketPaymentStatus,
  TicketStatus,
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
  mapMarkTicketUsedRpcError,
  mapReserveTicketsRpcError,
  parseReservationBuyer,
  parseReservationLines,
  validateReservationBuyer,
  validateReservationLines,
} from "@/lib/ticket-sales/utils";
import {
  mapPublicKioskOrderRpcError,
  parseKioskReservationItemsFromFormData,
} from "@/lib/kiosk/utils";
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

  if (profile.role !== ROLES.CUSTOMER && profile.role !== ROLES.ADMIN) {
    return {
      error: "Tu cuenta no puede reservar entradas desde la web.",
    } as const;
  }

  return { supabase, profile } as const;
}

function revalidateReservationPaths(eventSlug: string, eventId: string) {
  revalidatePath(ROUTES.evento(eventSlug));
  revalidatePath(ROUTES.eventoEntradas(eventSlug));
  revalidatePath(ROUTES.adminEventoVentas(eventId));
  revalidatePath(ROUTES.adminEventoEntradas(eventId));
  revalidatePath(ROUTES.adminEventoKiosco(eventId));
  revalidatePath(ROUTES.adminEventoGestion(eventId));
  revalidatePath(ROUTES.miCuentaEntradas);
  revalidatePath(ROUTES.admin);
  revalidatePath(ROUTES.adminVentas);
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

  const access = await resolveEventPublicAccess(event, auth.profile.id);
  if (access !== "full") {
    return {
      success: false,
      error:
        "Este evento es exclusivo para miembros activos de la comunidad Australe.",
    };
  }

  if (!isInternalSaleEnabled(event)) {
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

  const kioskItems = parseKioskReservationItemsFromFormData(formData);

  if (kioskItems.length > 0 && !buyer.buyer_whatsapp && !buyer.buyer_dni) {
    return {
      success: false,
      error: "Para reservar consumisiones completá WhatsApp o DNI.",
    };
  }

  const ticketLines = lines.map((line) => {
    const ticketType = freshTypes.get(line.ticketTypeId)!;

    return {
      ticketTypeName: ticketType.name,
      quantity: line.quantity,
      unitPrice: ticketType.public_price,
      subtotal: ticketType.public_price * line.quantity,
    };
  });

  const ticketsTotal = ticketLines.reduce(
    (sum, line) => sum + line.subtotal,
    0,
  );

  let totalTickets = 0;
  let reservationExpiresAt: string | undefined;
  let firstTicketId: string | undefined;
  const createdTickets: Array<{
    ticketTypeName: string;
    qrToken: string;
    unitPrice: number;
    paymentStatus: string;
    ticketStatus: string;
  }> = [];

  for (const line of lines) {
    const ticketType = freshTypes.get(line.ticketTypeId)!;
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

    for (const ticket of tickets) {
      if (!firstTicketId && ticket.id) {
        firstTicketId = ticket.id as string;
      }

      if (!reservationExpiresAt && ticket.reservation_expires_at) {
        reservationExpiresAt = ticket.reservation_expires_at as string;
      }

      createdTickets.push({
        ticketTypeName: ticketType.name,
        qrToken: ticket.qr_token as string,
        unitPrice: ticketType.public_price,
        paymentStatus: ticket.payment_status as string,
        ticketStatus: ticket.ticket_status as string,
      });
    }
  }

  if (totalTickets === 0) {
    return {
      success: false,
      error:
        "No se crearon entradas. Verificá que la función reserve_tickets esté desplegada en Supabase.",
    };
  }

  let kioskOrder:
    | {
        orderCode: string;
        totalAmount: number;
        lines: Array<{
          productName: string;
          quantity: number;
          unitPrice: number;
          subtotal: number;
        }>;
      }
    | undefined;
  let kioskError: string | undefined;

  if (kioskItems.length > 0) {
    const { data: kioskData, error: kioskRpcError } = await auth.supabase.rpc(
      "create_public_kiosk_order_linked",
      {
        p_event_id: event.id,
        p_ticket_id: firstTicketId ?? null,
        p_buyer_name: buyer.buyer_name,
        p_buyer_whatsapp: buyer.buyer_whatsapp || null,
        p_buyer_dni: buyer.buyer_dni || null,
        p_buyer_email: null,
        p_notes: null,
        p_items: kioskItems.map((item) => ({
          event_kiosk_product_id: item.eventKioskProductId,
          quantity: item.quantity,
        })),
      },
    );

    if (kioskRpcError) {
      console.error(
        "reserveTicketsAction kiosk rpc:",
        kioskRpcError.message,
      );
      kioskError =
        "La entrada fue registrada, pero no se pudieron reservar las consumisiones. Podés intentarlo desde la sección de preventa de consumisiones.";
      const mapped = mapPublicKioskOrderRpcError(kioskRpcError.message);
      if (mapped.includes("Stock insuficiente")) {
        kioskError = `${mapped} Podés intentarlo desde la sección de preventa de consumisiones.`;
      }
    } else {
      const kioskRow = Array.isArray(kioskData) ? kioskData[0] : kioskData;

      if (kioskRow?.order_code) {
        kioskOrder = {
          orderCode: kioskRow.order_code as string,
          totalAmount: Number(kioskRow.total_amount) || 0,
          lines: kioskItems.map((item) => ({
            productName: item.productName ?? "Producto",
            quantity: item.quantity,
            unitPrice: item.unitPrice ?? 0,
            subtotal: (item.unitPrice ?? 0) * item.quantity,
          })),
        };
      } else {
        kioskError =
          "La entrada fue registrada, pero no se pudieron reservar las consumisiones. Podés intentarlo desde la sección de preventa de consumisiones.";
      }
    }
  }

  revalidateReservationPaths(event.slug, event.id);

  return {
    success: true,
    ticketCount: totalTickets,
    reservationExpiresAt: reservationExpiresAt ?? getReservationExpiresAt(),
    buyer: {
      buyerName: buyer.buyer_name,
      buyerWhatsapp: buyer.buyer_whatsapp || null,
      buyerDni: buyer.buyer_dni || null,
    },
    tickets: createdTickets.map((ticket) => ({
      ticketTypeName: ticket.ticketTypeName,
      qrToken: ticket.qrToken,
      unitPrice: ticket.unitPrice,
      paymentStatus: ticket.paymentStatus as TicketPaymentStatus,
      ticketStatus: ticket.ticketStatus as TicketStatus,
    })),
    ticketsTotal,
    ticketLines,
    kioskOrder,
    kioskError,
    grandTotal: ticketsTotal + (kioskOrder?.totalAmount ?? 0),
  };
}

export async function reserveTicketsFormAction(
  eventSlug: string,
  _prevState: ReservationActionResult,
  formData: FormData,
): Promise<ReservationActionResult> {
  return reserveTicketsAction(eventSlug, formData);
}

export async function reserveTicketsWithKioskFormAction(
  eventSlug: string,
  _prevState: ReservationActionResult,
  formData: FormData,
): Promise<ReservationActionResult> {
  return reserveTicketsAction(eventSlug, formData);
}

export async function createPublicTicketReservationWithKioskAction(
  eventSlug: string,
  formData: FormData,
): Promise<ReservationActionResult> {
  return reserveTicketsAction(eventSlug, formData);
}

export async function confirmTicketPaymentAction(
  ticketId: string,
): Promise<TicketAdminActionResult> {
  const auth = await requireAdmin();
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
  const auth = await requireAdmin();
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
  const auth = await requireAdmin();
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

export async function markTicketUsedAction(
  ticketId: string,
): Promise<TicketAdminActionResult> {
  const auth = await requireActiveProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { data, error } = await auth.supabase.rpc("mark_ticket_used", {
    p_ticket_id: ticketId,
  });

  if (error) {
    return {
      success: false,
      error: mapMarkTicketUsedRpcError(error.message),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.ticket_id) {
    return {
      success: false,
      error: "No se pudo marcar la entrada como usada.",
    };
  }

  const eventId = row.event_id as string;
  const event = await assertPublishedEventForReservation(eventId);
  if (event) {
    revalidateReservationPaths(event.slug, eventId);
  } else {
    revalidatePath(ROUTES.adminEventoVentas(eventId));
    revalidatePath(ROUTES.miCuentaEntradas);
  }

  return { success: true };
}
