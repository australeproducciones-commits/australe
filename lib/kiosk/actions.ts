"use server";

import { requireCustomerAction } from "@/lib/auth/requireCustomerAction";
import {
  requireAdmin,
  requireCashierForEvent,
} from "@/lib/auth/require";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { ROUTES } from "@/lib/constants/routes";
import { slugifyName } from "@/lib/events/utils";
import {
  getEventKioskProductByIdForAdmin,
  getKioskProductByIdForAdmin,
} from "@/lib/kiosk/queries";
import { isUuid } from "@/lib/events/adminRoutes";
import type {
  EventKioskProductInput,
  EventKioskSettingsInput,
  KioskActionResult,
  KioskOrderManageResult,
  KioskProductInput,
  ManualKioskOrderInput,
  ManualKioskOrderResult,
  PublicKioskOrderInput,
  PublicKioskOrderLinkedInput,
  PublicKioskOrderResult,
} from "@/lib/kiosk/types";
import {
  mapManageKioskOrderRpcError,
  mapManualKioskOrderRpcError,
  mapPublicKioskOrderRpcError,
  normalizeOptionalText,
  validateKioskPrice,
  validateKioskCommunityPrice,
  validateKioskMaxPerOrder,
} from "@/lib/kiosk/utils";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateKioskAdminPaths(eventId?: string) {
  revalidatePath(ROUTES.adminProductos);
  revalidatePath(ROUTES.adminEventos);

  if (eventId) {
    revalidatePath(ROUTES.adminEvento(eventId));
    revalidatePath(ROUTES.adminEventoKiosco(eventId));
  }
}

function buildUniqueSlug(base: string, existingSlug?: string): string {
  const normalized = slugifyName(base);
  if (!normalized) {
    return `producto-${Date.now()}`;
  }

  if (existingSlug && existingSlug === normalized) {
    return normalized;
  }

  return normalized;
}

export async function upsertEventKioskSettingsAction(
  eventId: string,
  input: EventKioskSettingsInput,
): Promise<KioskActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const payload = {
    event_id: eventId,
    presale_enabled: input.presale_enabled ?? false,
    manual_sales_enabled: input.manual_sales_enabled ?? true,
    qr_sale_enabled: input.qr_sale_enabled ?? true,
    show_price_list: input.show_price_list ?? true,
    notes: normalizeOptionalText(input.notes),
  };

  const { error } = await auth.supabase
    .from("event_kiosk_settings")
    .upsert(payload, { onConflict: "event_id" });

  if (error) {
    console.error("upsertEventKioskSettingsAction:", error.message);
    return { success: false, error: "No se pudo guardar la configuración." };
  }

  revalidateKioskAdminPaths(eventId);
  return { success: true, id: eventId };
}

export async function createKioskProductAction(
  input: KioskProductInput,
): Promise<KioskActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "El nombre del producto es obligatorio." };
  }

  const defaultPrice = input.default_price ?? null;
  if (defaultPrice != null) {
    const priceError = validateKioskPrice(defaultPrice);
    if (priceError) {
      return { success: false, error: priceError };
    }
  }

  const slug = buildUniqueSlug(input.slug?.trim() || name);

  const { data, error } = await auth.supabase
    .from("kiosk_products")
    .insert({
      name,
      slug,
      description: normalizeOptionalText(input.description),
      image_url: normalizeOptionalText(input.image_url),
      default_price: defaultPrice,
      category: normalizeOptionalText(input.category),
      category_id: null,
      sku: null,
      unit: "unidad",
      stock_on_hand: 0,
      stock_reserved: 0,
      low_stock_threshold: null,
      is_active: input.is_active ?? true,
    })
    .select("id")
    .single();

  if (error) {
    console.error("createKioskProductAction:", error.message);
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un producto con ese slug." };
    }
    return { success: false, error: "No se pudo crear el producto." };
  }

  revalidateKioskAdminPaths();
  return { success: true, id: data.id };
}

export async function updateKioskProductAction(
  productId: string,
  input: KioskProductInput,
): Promise<KioskActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const existing = await getKioskProductByIdForAdmin(productId);
  if (!existing) {
    return { success: false, error: "Producto no encontrado." };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "El nombre del producto es obligatorio." };
  }

  const defaultPrice = input.default_price ?? null;
  if (defaultPrice != null) {
    const priceError = validateKioskPrice(defaultPrice);
    if (priceError) {
      return { success: false, error: priceError };
    }
  }

  const slug = buildUniqueSlug(input.slug?.trim() || name, existing.slug);

  const { error } = await auth.supabase
    .from("kiosk_products")
    .update({
      name,
      slug,
      description: normalizeOptionalText(input.description),
      image_url: normalizeOptionalText(input.image_url),
      default_price: defaultPrice,
      category: normalizeOptionalText(input.category),
      is_active: input.is_active ?? existing.is_active,
    })
    .eq("id", productId);

  if (error) {
    console.error("updateKioskProductAction:", error.message);
    if (error.code === "23505") {
      return { success: false, error: "Ya existe un producto con ese slug." };
    }
    return { success: false, error: "No se pudo actualizar el producto." };
  }

  revalidateKioskAdminPaths();
  return { success: true, id: productId };
}

export async function addProductToEventKioskAction(
  eventId: string,
  productId: string,
  input: EventKioskProductInput,
): Promise<KioskActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const product = await getKioskProductByIdForAdmin(productId);
  if (!product) {
    return { success: false, error: "Producto no encontrado." };
  }

  const priceError = validateKioskPrice(input.price);
  if (priceError) {
    return { success: false, error: priceError };
  }

  const communityPriceError = validateKioskCommunityPrice(input.community_price);
  if (communityPriceError) {
    return { success: false, error: communityPriceError };
  }

  const maxPerOrderError = validateKioskMaxPerOrder(input.max_per_order);
  if (maxPerOrderError) {
    return { success: false, error: maxPerOrderError };
  }

  const { data, error } = await auth.supabase
    .from("event_kiosk_products")
    .insert({
      event_id: eventId,
      product_id: productId,
      price: input.price,
      community_price: input.community_price ?? null,
      stock_total: null,
      is_available: input.is_available ?? true,
      is_visible: input.is_visible ?? true,
      presale_enabled: input.presale_enabled ?? true,
      qr_sale_enabled: input.qr_sale_enabled ?? true,
      cashier_sale_enabled: input.cashier_sale_enabled ?? true,
      max_per_order: input.max_per_order ?? null,
      sort_order: input.sort_order ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("addProductToEventKioskAction:", error.message);
    if (error.code === "23505") {
      return {
        success: false,
        error: "Ese producto ya está agregado al evento.",
      };
    }
    return { success: false, error: "No se pudo agregar el producto al evento." };
  }

  revalidateKioskAdminPaths(eventId);
  return { success: true, id: data.id };
}

export async function updateEventKioskProductAction(
  eventKioskProductId: string,
  input: EventKioskProductInput,
): Promise<KioskActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const existing = await getEventKioskProductByIdForAdmin(eventKioskProductId);
  if (!existing) {
    return { success: false, error: "Producto del evento no encontrado." };
  }

  const priceError = validateKioskPrice(input.price);
  if (priceError) {
    return { success: false, error: priceError };
  }

  const communityPriceError = validateKioskCommunityPrice(input.community_price);
  if (communityPriceError) {
    return { success: false, error: communityPriceError };
  }

  const maxPerOrderError = validateKioskMaxPerOrder(input.max_per_order);
  if (maxPerOrderError) {
    return { success: false, error: maxPerOrderError };
  }

  const { error } = await auth.supabase
    .from("event_kiosk_products")
    .update({
      price: input.price,
      community_price:
        input.community_price !== undefined
          ? input.community_price
          : existing.community_price,
      is_available: input.is_available ?? existing.is_available,
      is_visible: input.is_visible ?? existing.is_visible,
      presale_enabled: input.presale_enabled ?? existing.presale_enabled,
      qr_sale_enabled: input.qr_sale_enabled ?? existing.qr_sale_enabled,
      cashier_sale_enabled:
        input.cashier_sale_enabled ?? existing.cashier_sale_enabled,
      max_per_order:
        input.max_per_order !== undefined
          ? input.max_per_order
          : existing.max_per_order,
      sort_order: input.sort_order ?? existing.sort_order,
    })
    .eq("id", eventKioskProductId);

  if (error) {
    console.error("updateEventKioskProductAction:", error.message);
    return { success: false, error: "No se pudo actualizar el producto del evento." };
  }

  revalidateKioskAdminPaths(existing.event_id);
  return { success: true, id: eventKioskProductId };
}

export async function toggleEventKioskProductAvailabilityAction(
  eventKioskProductId: string,
  isAvailable: boolean,
): Promise<KioskActionResult> {
  const existing = await getEventKioskProductByIdForAdmin(eventKioskProductId);

  if (!existing) {
    return { success: false, error: "Producto del evento no encontrado." };
  }

  return updateEventKioskProductAction(eventKioskProductId, {
    price: existing.price,
    community_price: existing.community_price,
    is_available: isAvailable,
    is_visible: existing.is_visible,
    presale_enabled: existing.presale_enabled,
    qr_sale_enabled: existing.qr_sale_enabled,
    cashier_sale_enabled: existing.cashier_sale_enabled,
    max_per_order: existing.max_per_order,
    sort_order: existing.sort_order,
  });
}

export async function createManualKioskOrderAction(
  eventId: string,
  input: ManualKioskOrderInput,
): Promise<ManualKioskOrderResult> {
  const auth = await requireCashierForEvent(eventId);
  if ("error" in auth) {
    return {
      ok: false,
      message: auth.error ?? "No tenés permiso para realizar esta acción.",
    };
  }

  const buyerName = input.buyerName.trim();
  if (!buyerName) {
    return { ok: false, message: "El nombre del comprador es obligatorio." };
  }

  if (input.paymentStatus !== "pending" && input.paymentStatus !== "paid") {
    return { ok: false, message: "Estado de pago inválido." };
  }

  const items = input.items.filter((item) => item.quantity > 0);

  if (items.length === 0) {
    return {
      ok: false,
      message: "Seleccioná al menos un producto con cantidad mayor a 0.",
    };
  }

  for (const item of items) {
    if (!item.eventKioskProductId) {
      return { ok: false, message: "Hay un producto inválido en la venta." };
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false, message: "Las cantidades deben ser enteros positivos." };
    }
  }

  const ticketId = normalizeOptionalText(input.ticketId ?? null);

  const { data, error } = await auth.supabase.rpc("create_manual_kiosk_order", {
    p_event_id: eventId,
    p_buyer_name: buyerName,
    p_buyer_whatsapp: normalizeOptionalText(input.buyerWhatsapp),
    p_buyer_dni: normalizeOptionalText(input.buyerDni),
    p_buyer_email: normalizeOptionalText(input.buyerEmail),
    p_ticket_id: ticketId,
    p_payment_status: input.paymentStatus,
    p_notes: normalizeOptionalText(input.notes),
    p_items: items.map((item) => ({
      event_kiosk_product_id: item.eventKioskProductId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    console.error("createManualKioskOrderAction:", error.message);
    return { ok: false, message: mapManualKioskOrderRpcError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.order_id) {
    return { ok: false, message: "No se pudo registrar la venta." };
  }

  revalidateKioskAdminPaths(eventId);

  return {
    ok: true,
    orderId: row.order_id as string,
    orderCode: row.order_code as string,
    totalAmount: Number(row.total_amount) || 0,
  };
}

export async function createPublicKioskOrderAction(
  eventId: string,
  input: PublicKioskOrderInput,
): Promise<PublicKioskOrderResult> {
  const auth = await requireCustomerAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const profile = auth.profile;

  const isCommunityMember = await isActiveCommunityMember(profile.id);
  if (!isCommunityMember) {
    return {
      ok: false,
      message:
        "La preventa de consumiciones es exclusiva para miembros de la comunidad.",
    };
  }

  if (!isUuid(eventId)) {
    return { ok: false, message: "Evento inválido." };
  }

  const buyerName = input.buyerName.trim();
  if (!buyerName) {
    return { ok: false, message: "Ingresá tu nombre." };
  }

  const buyerWhatsapp = normalizeOptionalText(input.buyerWhatsapp);
  const buyerDni = normalizeOptionalText(input.buyerDni);
  const buyerEmail = normalizeOptionalText(input.buyerEmail);

  if (!buyerWhatsapp && !buyerDni && !buyerEmail) {
    return {
      ok: false,
      message: "Completá al menos WhatsApp, DNI o email.",
    };
  }

  const items = input.items.filter((item) => item.quantity > 0);

  if (items.length === 0) {
    return {
      ok: false,
      message: "Seleccioná al menos un producto con cantidad mayor a 0.",
    };
  }

  for (const item of items) {
    if (!item.eventKioskProductId || !isUuid(item.eventKioskProductId)) {
      return { ok: false, message: "Hay un producto inválido en la reserva." };
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return {
        ok: false,
        message: "Las cantidades deben ser enteros positivos.",
      };
    }
  }

  const { supabase } = auth;

  const { data, error } = await supabase.rpc("create_public_kiosk_order", {
    p_event_id: eventId,
    p_buyer_name: buyerName,
    p_buyer_whatsapp: buyerWhatsapp,
    p_buyer_dni: buyerDni,
    p_buyer_email: buyerEmail,
    p_notes: normalizeOptionalText(input.notes),
    p_items: items.map((item) => ({
      event_kiosk_product_id: item.eventKioskProductId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    console.error("createPublicKioskOrderAction:", error.message);
    return { ok: false, message: mapPublicKioskOrderRpcError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.order_id) {
    return { ok: false, message: "No se pudo confirmar la reserva." };
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .maybeSingle();

  if (eventRow?.slug) {
    revalidatePath(ROUTES.evento(eventRow.slug));
  }

  revalidateKioskAdminPaths(eventId);

  return {
    ok: true,
    orderId: row.order_id as string,
    orderCode: row.order_code as string,
    totalAmount: Number(row.total_amount) || 0,
  };
}

export async function createPublicKioskOrderLinkedAction(
  eventId: string,
  input: PublicKioskOrderLinkedInput,
): Promise<PublicKioskOrderResult> {
  const auth = await requireCustomerAction();
  if ("error" in auth) {
    return { ok: false, message: auth.error };
  }

  const profile = auth.profile;

  const isCommunityMember = await isActiveCommunityMember(profile.id);
  if (!isCommunityMember) {
    return {
      ok: false,
      message:
        "La preventa de consumiciones es exclusiva para miembros de la comunidad.",
    };
  }

  if (!isUuid(eventId)) {
    return { ok: false, message: "Evento inválido." };
  }

  const ticketId = normalizeOptionalText(input.ticketId ?? null);
  if (ticketId && !isUuid(ticketId)) {
    return { ok: false, message: "Entrada inválida." };
  }

  const buyerName = input.buyerName.trim();
  if (!buyerName) {
    return { ok: false, message: "Ingresá tu nombre." };
  }

  const buyerWhatsapp = normalizeOptionalText(input.buyerWhatsapp);
  const buyerDni = normalizeOptionalText(input.buyerDni);
  const buyerEmail = normalizeOptionalText(input.buyerEmail);

  if (!buyerWhatsapp && !buyerDni && !buyerEmail) {
    return {
      ok: false,
      message: "Completá al menos WhatsApp, DNI o email.",
    };
  }

  const items = input.items.filter((item) => item.quantity > 0);

  if (items.length === 0) {
    return {
      ok: false,
      message: "Seleccioná al menos un producto con cantidad mayor a 0.",
    };
  }

  for (const item of items) {
    if (!item.eventKioskProductId || !isUuid(item.eventKioskProductId)) {
      return { ok: false, message: "Hay un producto inválido en la reserva." };
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return {
        ok: false,
        message: "Las cantidades deben ser enteros positivos.",
      };
    }
  }

  const { supabase } = auth;

  const { data, error } = await supabase.rpc("create_public_kiosk_order_linked", {
    p_event_id: eventId,
    p_ticket_id: ticketId,
    p_buyer_name: buyerName,
    p_buyer_whatsapp: buyerWhatsapp,
    p_buyer_dni: buyerDni,
    p_buyer_email: buyerEmail,
    p_notes: normalizeOptionalText(input.notes),
    p_items: items.map((item) => ({
      event_kiosk_product_id: item.eventKioskProductId,
      quantity: item.quantity,
    })),
  });

  if (error) {
    console.error("createPublicKioskOrderLinkedAction:", error.message);
    return { ok: false, message: mapPublicKioskOrderRpcError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;

  if (!row?.order_id) {
    return { ok: false, message: "No se pudo confirmar la reserva." };
  }

  const { data: eventRow } = await supabase
    .from("events")
    .select("slug")
    .eq("id", eventId)
    .maybeSingle();

  if (eventRow?.slug) {
    revalidatePath(ROUTES.evento(eventRow.slug));
    revalidatePath(ROUTES.eventoEntradas(eventRow.slug));
  }

  revalidateKioskAdminPaths(eventId);

  return {
    ok: true,
    orderId: row.order_id as string,
    orderCode: row.order_code as string,
    totalAmount: Number(row.total_amount) || 0,
  };
}

async function requireStaffForOrderManage(
  orderId: string,
  eventId: string,
): Promise<
  | { error: KioskOrderManageResult }
  | { supabase: Awaited<ReturnType<typeof createClient>> }
> {
  const auth = await requireCashierForEvent(eventId);
  if ("error" in auth) {
    return {
      error: {
        ok: false,
        message: auth.error ?? "No tenés permiso para realizar esta acción.",
      },
    };
  }

  if (!isUuid(orderId) || !isUuid(eventId)) {
    return { error: { ok: false, message: "Identificador de orden inválido." } };
  }

  return { supabase: auth.supabase };
}

export async function markKioskOrderPaidAction(
  orderId: string,
  eventId: string,
): Promise<KioskOrderManageResult> {
  const auth = await requireStaffForOrderManage(orderId, eventId);
  if ("error" in auth) {
    return auth.error;
  }

  const { error } = await auth.supabase.rpc("mark_kiosk_order_paid", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("mark_kiosk_order_paid:", error.message);
    return { ok: false, message: mapManageKioskOrderRpcError(error.message) };
  }

  revalidateKioskAdminPaths(eventId);
  return { ok: true, message: "Orden marcada como pagada." };
}

export async function markKioskOrderReadyAction(
  orderId: string,
  eventId: string,
): Promise<KioskOrderManageResult> {
  const auth = await requireStaffForOrderManage(orderId, eventId);
  if ("error" in auth) {
    return auth.error;
  }

  const { error } = await auth.supabase.rpc("mark_kiosk_order_ready", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("mark_kiosk_order_ready:", error.message);
    return { ok: false, message: mapManageKioskOrderRpcError(error.message) };
  }

  revalidateKioskAdminPaths(eventId);
  return { ok: true, message: "Orden marcada como lista para retirar." };
}

export async function markKioskOrderDeliveredAction(
  orderId: string,
  eventId: string,
): Promise<KioskOrderManageResult> {
  const auth = await requireStaffForOrderManage(orderId, eventId);
  if ("error" in auth) {
    return auth.error;
  }

  const { error } = await auth.supabase.rpc("mark_kiosk_order_delivered", {
    p_order_id: orderId,
  });

  if (error) {
    console.error("mark_kiosk_order_delivered:", error.message);
    return { ok: false, message: mapManageKioskOrderRpcError(error.message) };
  }

  revalidateKioskAdminPaths(eventId);
  return { ok: true, message: "Orden marcada como entregada." };
}

export async function cancelKioskOrderAction(
  orderId: string,
  eventId: string,
  reason: string,
): Promise<KioskOrderManageResult> {
  const auth = await requireStaffForOrderManage(orderId, eventId);
  if ("error" in auth) {
    return auth.error;
  }

  const { error } = await auth.supabase.rpc("cancel_kiosk_order", {
    p_order_id: orderId,
    p_reason: normalizeOptionalText(reason),
  });

  if (error) {
    console.error("cancel_kiosk_order:", error.message);
    return { ok: false, message: mapManageKioskOrderRpcError(error.message) };
  }

  revalidateKioskAdminPaths(eventId);
  return { ok: true, message: "Orden cancelada y stock liberado." };
}
