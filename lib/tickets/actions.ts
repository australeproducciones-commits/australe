"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import {
  hasTicketsSoldForType,
  getTicketTypeByIdForAdmin,
} from "@/lib/tickets/queries";
import type { TicketTypeActionResult } from "@/lib/tickets/types";
import {
  parseTicketTypeFormData,
  ticketTypeFormToPayload,
  validateTicketTypeForm,
} from "@/lib/tickets/utils";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdminAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return { error: "No tenés permiso para realizar esta acción." as const };
  }

  return { supabase, profile };
}

function revalidateTicketTypePaths(eventId: string, eventSlug?: string) {
  revalidatePath(ROUTES.adminEventoEntradas(eventId));
  revalidatePath(ROUTES.adminEvento(eventId));
  revalidatePath(ROUTES.adminEventos);

  if (eventSlug) {
    revalidatePath(ROUTES.evento(eventSlug));
    revalidatePath(ROUTES.eventoEntradas(eventSlug));
  }
}

export async function createTicketTypeAction(
  eventId: string,
  formData: FormData,
): Promise<TicketTypeActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const input = parseTicketTypeFormData(formData);
  const validationError = validateTicketTypeForm(input);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const payload = ticketTypeFormToPayload(input, eventId);

  const { data, error } = await auth.supabase
    .from("ticket_types")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "No se pudo crear el tipo de entrada." };
  }

  revalidateTicketTypePaths(eventId);
  return { success: true, ticketTypeId: data.id };
}

export async function updateTicketTypeAction(
  ticketTypeId: string,
  formData: FormData,
): Promise<TicketTypeActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const existing = await getTicketTypeByIdForAdmin(ticketTypeId);

  if (!existing) {
    return { success: false, error: "Tipo de entrada no encontrado." };
  }

  const input = parseTicketTypeFormData(formData);
  const validationError = validateTicketTypeForm(input);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const payload = ticketTypeFormToPayload(input, existing.event_id);

  const { data, error } = await auth.supabase
    .from("ticket_types")
    .update({
      name: payload.name,
      description: payload.description,
      public_price: payload.public_price,
      community_price: payload.community_price,
      stock_total: payload.stock_total,
      max_per_order: payload.max_per_order,
      sale_start_at: payload.sale_start_at,
      sale_end_at: payload.sale_end_at,
      is_active: payload.is_active,
      sort_order: payload.sort_order,
    })
    .eq("id", ticketTypeId)
    .select("id, event_id")
    .single();

  if (error) {
    return { success: false, error: "No se pudo actualizar el tipo de entrada." };
  }

  revalidateTicketTypePaths(data.event_id);
  return { success: true, ticketTypeId: data.id };
}

export async function toggleTicketTypeActiveAction(
  ticketTypeId: string,
  isActive: boolean,
): Promise<TicketTypeActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { data, error } = await auth.supabase
    .from("ticket_types")
    .update({ is_active: isActive })
    .eq("id", ticketTypeId)
    .select("id, event_id")
    .single();

  if (error) {
    return {
      success: false,
      error: "No se pudo cambiar el estado del tipo de entrada.",
    };
  }

  revalidateTicketTypePaths(data.event_id);
  return { success: true, ticketTypeId: data.id };
}

export async function deleteTicketTypeAction(
  ticketTypeId: string,
): Promise<TicketTypeActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const existing = await getTicketTypeByIdForAdmin(ticketTypeId);

  if (!existing) {
    return { success: false, error: "Tipo de entrada no encontrado." };
  }

  if (existing.stock_sold > 0) {
    return {
      success: false,
      error: "No se puede eliminar: ya hay entradas vendidas asociadas.",
    };
  }

  const hasTickets = await hasTicketsSoldForType(ticketTypeId);

  if (hasTickets) {
    return {
      success: false,
      error: "No se puede eliminar: ya hay entradas vendidas asociadas.",
    };
  }

  const { error } = await auth.supabase
    .from("ticket_types")
    .delete()
    .eq("id", ticketTypeId);

  if (error) {
    return { success: false, error: "No se pudo eliminar el tipo de entrada." };
  }

  revalidateTicketTypePaths(existing.event_id);
  return { success: true, ticketTypeId };
}

export async function createTicketTypeFormAction(
  eventId: string,
  _prevState: TicketTypeActionResult,
  formData: FormData,
): Promise<TicketTypeActionResult> {
  return createTicketTypeAction(eventId, formData);
}

export async function updateTicketTypeFormAction(
  ticketTypeId: string,
  _prevState: TicketTypeActionResult,
  formData: FormData,
): Promise<TicketTypeActionResult> {
  return updateTicketTypeAction(ticketTypeId, formData);
}
