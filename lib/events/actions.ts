"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import {
  EVENT_STATUS_VALUES,
  type EventStatus,
} from "@/lib/constants/event-status";
import type { EventActionResult } from "@/lib/events/types";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import { resolveSalesQrPayload } from "@/lib/events/salesQr";
import {
  eventFormToInsertPayload,
  eventFormToPayload,
  parseEventFormData,
  validateEventForm,
} from "@/lib/events/utils";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdminAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    return { error: "No tenés permiso para realizar esta acción." as const };
  }

  return { supabase, profile };
}

function revalidateEventPaths(slug?: string, salesQrCode?: string | null) {
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.eventos);
  revalidatePath(ROUTES.adminEventos);

  if (slug) {
    revalidatePath(ROUTES.evento(slug));
  }

  if (salesQrCode) {
    revalidatePath(ROUTES.ventaEvento(salesQrCode));
  }
}

async function syncKioskPresaleForQr(
  supabase: Awaited<ReturnType<typeof createClient>>,
  eventId: string,
  qrProductsEnabled: boolean,
  qrShowPriceList: boolean,
  qrSellProducts: boolean,
) {
  if (!qrProductsEnabled || (!qrShowPriceList && !qrSellProducts)) {
    return;
  }

  const { error } = await supabase.from("event_kiosk_settings").upsert(
    {
      event_id: eventId,
      presale_enabled: true,
      manual_sales_enabled: true,
      qr_sale_enabled: true,
      show_price_list: true,
      notes: null,
    },
    { onConflict: "event_id" },
  );

  if (error) {
    console.error("syncKioskPresaleForQr:", error);
  }
}

export async function createEventAction(
  formData: FormData,
): Promise<EventActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const input = parseEventFormData(formData);
  const validationError = validateEventForm(input);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const qrPayload = resolveSalesQrPayload(input, null);
  const payload = {
    ...eventFormToInsertPayload(input, auth.profile.id),
    ...qrPayload,
  };

  const { data, error } = await auth.supabase
    .from("events")
    .insert(payload)
    .select("id, slug, sales_qr_code")
    .single();

  if (error) {
    console.error("createEventAction:", error);
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un evento con ese slug." };
    }
    return {
      success: false,
      error: error.message || "No se pudo crear el evento.",
    };
  }

  await syncKioskPresaleForQr(
    auth.supabase,
    data.id,
    qrPayload.qr_products_enabled,
    qrPayload.qr_show_price_list,
    qrPayload.qr_sell_products,
  );

  revalidateEventPaths(data.slug, data.sales_qr_code);
  redirect(`${ROUTES.adminEventos}/${data.id}`);
}

export async function updateEventAction(
  eventId: string,
  formData: FormData,
): Promise<EventActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const input = parseEventFormData(formData);
  const validationError = validateEventForm(input);

  if (validationError) {
    return { success: false, error: validationError };
  }

  const existing = await getEventByIdForAdmin(eventId);
  const qrPayload = resolveSalesQrPayload(input, existing);
  const payload = {
    ...eventFormToPayload(input),
    ...qrPayload,
    social_presale_price: existing?.social_presale_price ?? null,
    social_regular_price: existing?.social_regular_price ?? null,
    box_office_preview: existing?.box_office_preview ?? null,
  };

  const { data, error } = await auth.supabase
    .from("events")
    .update(payload)
    .eq("id", eventId)
    .select("id, slug, sales_qr_code")
    .single();

  if (error) {
    console.error("updateEventAction:", error);
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un evento con ese slug." };
    }
    return {
      success: false,
      error: error.message || "No se pudo actualizar el evento.",
    };
  }

  await syncKioskPresaleForQr(
    auth.supabase,
    data.id,
    qrPayload.qr_products_enabled,
    qrPayload.qr_show_price_list,
    qrPayload.qr_sell_products,
  );

  revalidateEventPaths(data.slug, data.sales_qr_code);
  return { success: true, eventId: data.id };
}

export async function updateEventStatusAction(
  eventId: string,
  status: EventStatus,
): Promise<EventActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!EVENT_STATUS_VALUES.includes(status)) {
    return { success: false, error: "Estado no válido." };
  }

  const { data, error } = await auth.supabase
    .from("events")
    .update({ status })
    .eq("id", eventId)
    .select("slug")
    .single();

  if (error) {
    return { success: false, error: "No se pudo cambiar el estado." };
  }

  revalidateEventPaths(data.slug);
  return { success: true, eventId };
}

export async function toggleEventFeaturedAction(
  eventId: string,
  isFeatured: boolean,
): Promise<EventActionResult> {
  const auth = await requireAdminAction();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { data, error } = await auth.supabase
    .from("events")
    .update({ is_featured: isFeatured })
    .eq("id", eventId)
    .select("slug")
    .single();

  if (error) {
    return { success: false, error: "No se pudo actualizar el destacado." };
  }

  revalidateEventPaths(data.slug);
  return { success: true, eventId };
}

export async function createEventFormAction(
  _prevState: EventActionResult,
  formData: FormData,
): Promise<EventActionResult> {
  return createEventAction(formData);
}

export async function updateEventFormAction(
  eventId: string,
  _prevState: EventActionResult,
  formData: FormData,
): Promise<EventActionResult> {
  return updateEventAction(eventId, formData);
}
