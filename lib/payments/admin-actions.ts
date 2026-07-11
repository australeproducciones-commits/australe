"use server";

import { requireAdmin } from "@/lib/auth/require";
import { paymentService } from "@/lib/payments/service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoreActionResult } from "@/lib/store/types";
import { revalidatePath } from "next/cache";
import { ROUTES } from "@/lib/constants/routes";

export async function reconcileStoreOrderMercadoPagoAction(
  orderId: string,
  paymentId?: string,
): Promise<StoreActionResult & { outcome?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!paymentService.isEnabled()) {
    return { success: false, error: "Mercado Pago no está habilitado." };
  }

  const admin = createAdminClient();
  let targetPaymentId = paymentId?.trim();

  if (!targetPaymentId) {
    const { data: tx } = await admin
      .from("payment_transactions")
      .select("provider_payment_id")
      .eq("order_id", orderId)
      .not("provider_payment_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    targetPaymentId = (tx?.provider_payment_id as string | undefined) ?? undefined;
  }

  if (!targetPaymentId) {
    return { success: false, error: "No hay payment ID para reconciliar." };
  }

  try {
    const result = await paymentService.reconcileMercadoPagoPayment(targetPaymentId);
    revalidatePath(ROUTES.adminTiendaPedidos);
    return { success: true, id: orderId, outcome: result.outcome };
  } catch (error) {
    console.error("reconcileStoreOrderMercadoPagoAction:", error);
    return { success: false, error: "No se pudo reconciliar el pago." };
  }
}
