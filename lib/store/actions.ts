"use server";

import { requireAdmin, requireCashierForEvent } from "@/lib/auth/require";
import { awardLoyaltyPointsForStoreOrder } from "@/lib/community/loyalty/store";
import { ROUTES } from "@/lib/constants/routes";
import { slugifyName } from "@/lib/events/utils";
import type {
  CheckoutInput,
  CreateStoreOrderResult,
  EventStoreSettingsInput,
  StoreActionResult,
  StoreProductInput,
  StoreVariantInput,
} from "@/lib/store/types";
import { mapCreateStoreOrderRpcError } from "@/lib/store/utils";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function revalidateStorePaths(eventId?: string) {
  revalidatePath(ROUTES.tienda);
  revalidatePath(ROUTES.adminTienda);
  revalidatePath(ROUTES.adminTiendaProductos);
  revalidatePath(ROUTES.adminTiendaPedidos);
  revalidatePath(ROUTES.adminTiendaStock);

  if (eventId) {
    revalidatePath(ROUTES.adminEvento(eventId));
    revalidatePath(ROUTES.evento(""));
  }
}

export async function upsertStoreProductAction(
  productId: string | null,
  input: StoreProductInput,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "El nombre es obligatorio." };
  }

  const slug = slugifyName(input.slug?.trim() || name) || `producto-${Date.now()}`;
  const payload = {
    name,
    slug,
    description: input.description?.trim() || null,
    short_description: input.short_description?.trim() || null,
    sku: input.sku?.trim() || null,
    category: input.category ?? "general",
    status: input.status ?? "draft",
    public_price: input.public_price,
    community_price: input.community_price ?? null,
    cost_price: null,
    main_image_url: input.main_image_url ?? null,
    gallery_urls: input.gallery_urls ?? [],
    is_active: input.is_active ?? false,
    is_featured: input.is_featured ?? false,
    community_only: input.community_only ?? false,
    track_stock: input.track_stock ?? true,
    stock_total: input.stock_total ?? 0,
    max_per_order: input.max_per_order ?? null,
    available_from: input.available_from ?? null,
    available_until: input.available_until ?? null,
  };

  if (productId) {
    const { error } = await auth.supabase
      .from("store_products")
      .update(payload)
      .eq("id", productId);

    if (error) {
      console.error("upsertStoreProductAction update:", error.message);
      return { success: false, error: "No se pudo actualizar el producto." };
    }

    revalidateStorePaths();
    return { success: true, id: productId };
  }

  const { data, error } = await auth.supabase
    .from("store_products")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("upsertStoreProductAction insert:", error.message);
    return { success: false, error: "No se pudo crear el producto." };
  }

  revalidateStorePaths();
  return { success: true, id: data.id };
}

export async function toggleStoreProductActiveAction(
  productId: string,
  isActive: boolean,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { error } = await auth.supabase
    .from("store_products")
    .update({
      is_active: isActive,
      status: isActive ? "active" : "inactive",
    })
    .eq("id", productId);

  if (error) {
    console.error("toggleStoreProductActiveAction:", error.message);
    return { success: false, error: "No se pudo actualizar el estado." };
  }

  revalidateStorePaths();
  return { success: true, id: productId };
}

export async function archiveStoreProductAction(
  productId: string,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { error } = await auth.supabase
    .from("store_products")
    .update({
      is_active: false,
      status: "archived",
    })
    .eq("id", productId);

  if (error) {
    console.error("archiveStoreProductAction:", error.message);
    return { success: false, error: "No se pudo archivar el producto." };
  }

  revalidateStorePaths();
  return { success: true, id: productId };
}

export async function upsertStoreVariantAction(
  productId: string,
  variantId: string | null,
  input: StoreVariantInput,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const name = input.name.trim();
  if (!name) {
    return { success: false, error: "El nombre de la variante es obligatorio." };
  }

  const payload = {
    product_id: productId,
    name,
    sku: input.sku?.trim() || null,
    size: input.size?.trim() || null,
    color: input.color?.trim() || null,
    model: input.model?.trim() || null,
    price_override: input.price_override ?? null,
    community_price_override: input.community_price_override ?? null,
    stock_total: input.stock_total ?? 0,
    is_active: input.is_active ?? true,
    sort_order: input.sort_order ?? 0,
  };

  if (variantId) {
    const { error } = await auth.supabase
      .from("store_product_variants")
      .update(payload)
      .eq("id", variantId);

    if (error) {
      return { success: false, error: "No se pudo actualizar la variante." };
    }

    revalidateStorePaths();
    return { success: true, id: variantId };
  }

  const { data, error } = await auth.supabase
    .from("store_product_variants")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "No se pudo crear la variante." };
  }

  revalidateStorePaths();
  return { success: true, id: data.id };
}

export async function upsertEventStoreSettingsAction(
  eventId: string,
  input: EventStoreSettingsInput,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const payload = {
    event_id: eventId,
    merchandising_enabled: input.merchandising_enabled ?? false,
    show_badge: input.show_badge ?? true,
    badge_text: input.badge_text?.trim() || "MERCH DISPONIBLE",
    show_products_block: input.show_products_block ?? true,
    pickup_enabled: input.pickup_enabled ?? true,
    pickup_instructions: input.pickup_instructions?.trim() || null,
    max_featured_products: input.max_featured_products ?? 3,
  };

  const { error } = await auth.supabase
    .from("event_store_settings")
    .upsert(payload, { onConflict: "event_id" });

  if (error) {
    return { success: false, error: "No se pudo guardar la configuración." };
  }

  revalidateStorePaths(eventId);
  return { success: true, id: eventId };
}

export async function linkStoreProductToEventAction(
  eventId: string,
  productId: string,
  options?: {
    is_featured?: boolean;
    sort_order?: number;
    event_price_override?: number | null;
    pickup_available?: boolean;
  },
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { data, error } = await auth.supabase
    .from("event_store_products")
    .upsert(
      {
        event_id: eventId,
        product_id: productId,
        is_active: true,
        is_featured: options?.is_featured ?? false,
        sort_order: options?.sort_order ?? 0,
        event_price_override: options?.event_price_override ?? null,
        event_community_price_override: null,
        pickup_available: options?.pickup_available ?? true,
        pickup_instructions: null,
        starts_at: null,
        ends_at: null,
      },
      { onConflict: "event_id,product_id" },
    )
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "No se pudo asociar el producto al evento." };
  }

  revalidateStorePaths(eventId);
  return { success: true, id: data.id };
}

export async function adjustStoreStockAction(
  productId: string,
  variantId: string | null,
  quantityDelta: number,
  reason: string,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { error } = await auth.supabase.rpc("store_adjust_stock", {
    p_product_id: productId,
    p_variant_id: variantId,
    p_quantity_delta: quantityDelta,
    p_reason: reason.trim(),
  });

  if (error) {
    console.error("adjustStoreStockAction:", error.message);
    return { success: false, error: "No se pudo ajustar el stock." };
  }

  revalidateStorePaths();
  return { success: true, id: productId };
}

export async function createStoreOrderAction(
  input: CheckoutInput,
): Promise<CreateStoreOrderResult> {
  const supabase = await createClient();

  const items = input.items.map((item) => ({
    product_id: item.productId,
    variant_id: item.variantId,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc("create_store_order", {
    p_customer_name: input.customerName.trim(),
    p_customer_email: input.customerEmail?.trim() || null,
    p_customer_phone: input.customerPhone?.trim() || null,
    p_pickup_event_id: input.pickupEventId ?? null,
    p_event_id: input.eventId ?? null,
    p_items: items,
    p_apply_community_price: input.applyCommunityPrice ?? false,
  });

  if (error) {
    console.error("createStoreOrderAction:", error.message);
    return {
      success: false,
      error: mapCreateStoreOrderRpcError(error.message),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { success: false, error: "No se pudo crear el pedido." };
  }

  revalidatePath(ROUTES.tienda);
  revalidatePath(ROUTES.tiendaCarrito);

  return {
    success: true,
    orderId: row.order_id as string,
    orderNumber: row.order_number as string,
    total: Number(row.total_amount),
    pickupCode: row.pickup_code as string,
  };
}

export async function markStoreOrderPaidAction(
  orderId: string,
  paymentReference?: string,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { error } = await auth.supabase.rpc("mark_store_order_paid", {
    p_order_id: orderId,
    p_payment_provider: "manual",
    p_payment_reference: paymentReference ?? null,
  });

  if (error) {
    return { success: false, error: "No se pudo confirmar el pago." };
  }

  await awardLoyaltyPointsForStoreOrder(orderId);
  revalidateStorePaths();
  return { success: true, id: orderId };
}

export async function markStoreOrderReadyAction(
  orderId: string,
): Promise<StoreActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { error } = await auth.supabase.rpc("mark_store_order_ready", {
    p_order_id: orderId,
  });

  if (error) {
    return { success: false, error: "No se pudo marcar como listo." };
  }

  revalidateStorePaths();
  return { success: true, id: orderId };
}

export async function markStoreOrderDeliveredAction(
  orderId: string,
  pickupToken?: string,
): Promise<StoreActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_store_order_delivered", {
    p_order_id: orderId,
    p_pickup_token: pickupToken ?? null,
  });

  if (error) {
    console.error("markStoreOrderDeliveredAction:", error.message);
    return { success: false, error: "No se pudo registrar la entrega." };
  }

  revalidateStorePaths();
  return { success: true, id: orderId };
}

export async function cancelStoreOrderAction(
  orderId: string,
  reason?: string,
): Promise<StoreActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_store_order", {
    p_order_id: orderId,
    p_reason: reason ?? null,
  });

  if (error) {
    return { success: false, error: "No se pudo cancelar el pedido." };
  }

  revalidateStorePaths();
  return { success: true, id: orderId };
}

export async function lookupStorePickupOrderAction(
  code?: string,
  orderNumber?: string,
): Promise<StoreActionResult & { orders?: unknown[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lookup_store_order_for_pickup", {
    p_code: code ?? null,
    p_order_number: orderNumber ?? null,
  });

  if (error) {
    return { success: false, error: "No se encontró el pedido." };
  }

  return { success: true, orders: data ?? [] };
}

export async function deliverStorePickupAction(
  orderId: string,
  eventId: string,
): Promise<StoreActionResult> {
  const auth = await requireCashierForEvent(eventId);
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  return markStoreOrderDeliveredAction(orderId);
}
