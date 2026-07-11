import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  assertMercadoPagoConfigured,
  buildStoreExternalReference,
  isMercadoPagoEnabled,
} from "@/lib/payments/config";
import { recordStorePreferenceTransaction } from "@/lib/payments/reconciliation";
import { paymentService } from "@/lib/payments/service";
import { PAYMENT_MODULE } from "@/lib/payments/types";
import type { StoreOrder, StoreOrderItem } from "@/lib/store/types";

export type CreateStorePreferenceInput = {
  orderId: string;
  pickupCode?: string | null;
};

export type CreateStorePreferenceResult =
  | { success: true; initPoint: string; preferenceId: string }
  | { success: false; error: string; code?: string };

function isOrderPayable(order: StoreOrder): boolean {
  if (order.payment_status === "confirmed") {
    return false;
  }
  if (!["pending", "reserved", "expired", "cancelled"].includes(order.status)) {
    return false;
  }
  if (order.status === "expired" || order.status === "cancelled") {
    return false;
  }
  if (order.reserved_until) {
    return new Date(order.reserved_until).getTime() > Date.now();
  }
  return order.status === "reserved" || order.status === "pending";
}

async function verifyOrderAccess(
  order: StoreOrder,
  pickupCode?: string | null,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (order.user_id) {
    return user?.id === order.user_id;
  }

  if (!pickupCode || !order.pickup_code) {
    return false;
  }

  return order.pickup_code.toUpperCase() === pickupCode.trim().toUpperCase();
}

async function findReusablePreference(
  orderId: string,
  reservedUntil: string | null,
): Promise<{ preferenceId: string; initPoint: string } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_transactions")
    .select("provider_preference_id, created_at")
    .eq("module", PAYMENT_MODULE.STORE)
    .eq("order_id", orderId)
    .eq("provider", "mercadopago")
    .not("provider_preference_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.provider_preference_id) {
    return null;
  }

  try {
    const preference = await paymentService.getPreference(data.provider_preference_id);
    if (!preference.id || !preference.init_point) {
      return null;
    }

    if (reservedUntil && preference.expiration_date_to) {
      const expiresAt = new Date(preference.expiration_date_to).getTime();
      if (expiresAt <= Date.now()) {
        return null;
      }
    }

    const config = paymentService.getPublicConfig();
    const initPoint =
      config.environment === "test" && preference.sandbox_init_point
        ? preference.sandbox_init_point
        : preference.init_point;

    return { preferenceId: preference.id, initPoint };
  } catch {
    return null;
  }
}

export async function createStoreMercadoPagoPreference(
  input: CreateStorePreferenceInput,
): Promise<CreateStorePreferenceResult> {
  if (!isMercadoPagoEnabled()) {
    return { success: false, error: "Pagos con Mercado Pago no disponibles.", code: "disabled" };
  }

  try {
    assertMercadoPagoConfigured();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Mercado Pago no configurado.",
      code: "not_configured",
    };
  }

  const admin = createAdminClient();
  const { data: order, error: orderError } = await admin
    .from("store_orders")
    .select("*")
    .eq("id", input.orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { success: false, error: "Pedido no encontrado.", code: "not_found" };
  }

  const storeOrder = order as StoreOrder;

  if (!(await verifyOrderAccess(storeOrder, input.pickupCode))) {
    return { success: false, error: "No tenés permiso para pagar este pedido.", code: "forbidden" };
  }

  if (storeOrder.payment_channel === "manual") {
    return {
      success: false,
      error: "Este pedido está configurado para pago en caja.",
      code: "manual_channel",
    };
  }

  if (storeOrder.payment_status === "confirmed") {
    return {
      success: false,
      error: "Este pedido ya fue pagado.",
      code: "already_paid",
    };
  }

  if (!isOrderPayable(storeOrder)) {
    return {
      success: false,
      error: "Este pedido ya no admite pago o la reserva expiró.",
      code: "not_payable",
    };
  }

  const reusable = await findReusablePreference(
    storeOrder.id,
    storeOrder.reserved_until,
  );
  if (reusable) {
    return {
      success: true,
      initPoint: reusable.initPoint,
      preferenceId: reusable.preferenceId,
    };
  }

  const { data: items, error: itemsError } = await admin
    .from("store_order_items")
    .select("*")
    .eq("order_id", storeOrder.id)
    .order("created_at");

  if (itemsError || !items?.length) {
    return { success: false, error: "El pedido no tiene ítems.", code: "empty_order" };
  }

  const orderItems = items as StoreOrderItem[];
  const externalReference = buildStoreExternalReference(storeOrder.id);
  const expiresAt = storeOrder.reserved_until
    ? new Date(storeOrder.reserved_until)
    : new Date(Date.now() + 30 * 60 * 1000);

  const checkout = await paymentService.createCheckout({
    module: PAYMENT_MODULE.STORE,
    orderId: storeOrder.id,
    orderNumber: storeOrder.order_number,
    externalReference,
    total: Number(storeOrder.total),
    currency: "ARS",
    payerEmail: storeOrder.customer_email,
    expiresAt,
    items: orderItems.map((item) => ({
      id: item.id,
      title: item.variant_name_snapshot
        ? `${item.product_name_snapshot} (${item.variant_name_snapshot})`
        : item.product_name_snapshot,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      currency_id: "ARS",
    })),
  });

  await recordStorePreferenceTransaction({
    orderId: storeOrder.id,
    preferenceId: checkout.preferenceId,
    amount: Number(storeOrder.total),
    externalReference,
  });

  await admin
    .from("store_orders")
    .update({
      payment_provider: "mercadopago",
      payment_reference: checkout.preferenceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeOrder.id);

  return {
    success: true,
    initPoint: checkout.initPoint,
    preferenceId: checkout.preferenceId,
  };
}
