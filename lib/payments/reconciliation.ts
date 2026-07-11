import { createHash } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildStoreExternalReference,
  parseStoreExternalReference,
} from "@/lib/payments/config";
import {
  getMercadoPagoPayment,
  mapMercadoPagoPaymentStatus,
} from "@/lib/payments/providers/mercadopago";
import type { ProviderPayment, ReconcileResult } from "@/lib/payments/types";
import { PAYMENT_PROVIDER, RECONCILE_OUTCOME } from "@/lib/payments/types";

export function hashWebhookPayload(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export async function registerWebhookEvent(input: {
  provider: string;
  requestId: string | null;
  topic: string | null;
  resourceId: string | null;
  payloadHash: string;
}): Promise<{ eventId: string; isDuplicate: boolean; processingStatus: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("register_payment_webhook_event", {
    p_provider: input.provider,
    p_request_id: input.requestId,
    p_topic: input.topic,
    p_resource_id: input.resourceId,
    p_payload_hash: input.payloadHash,
  });

  if (error) {
    throw new Error(`register_payment_webhook_event: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("No se pudo registrar el evento webhook.");
  }

  return {
    eventId: row.event_id as string,
    isDuplicate: Boolean(row.is_duplicate),
    processingStatus: row.processing_status as string,
  };
}

export async function completeWebhookEvent(
  eventId: string,
  status: "processed" | "failed" | "ignored",
  errorCode?: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("complete_payment_webhook_event", {
    p_event_id: eventId,
    p_status: status,
    p_error_code: errorCode ?? null,
  });

  if (error) {
    console.error("complete_payment_webhook_event:", error.message);
  }
}

export function resolveOrderIdFromPayment(payment: ProviderPayment): string | null {
  const fromReference = parseStoreExternalReference(payment.externalReference);
  if (fromReference) {
    return fromReference;
  }
  return null;
}

export async function reconcileStorePayment(input: {
  orderId: string;
  payment: ProviderPayment;
  preferenceId?: string | null;
}): Promise<ReconcileResult> {
  const mappedStatus = mapMercadoPagoPaymentStatus(input.payment.status);
  if (mappedStatus === "unknown") {
    return {
      outcome: RECONCILE_OUTCOME.IGNORED,
      orderId: input.orderId,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reconcile_store_order_payment", {
    p_order_id: input.orderId,
    p_provider: PAYMENT_PROVIDER.MERCADOPAGO,
    p_provider_payment_id: input.payment.id,
    p_provider_preference_id: input.preferenceId ?? input.payment.preferenceId,
    p_external_reference:
      input.payment.externalReference ?? buildStoreExternalReference(input.orderId),
    p_amount: input.payment.transactionAmount,
    p_currency: input.payment.currencyId,
    p_provider_status: mappedStatus,
    p_status_detail: input.payment.statusDetail,
    p_payer_email: input.payment.payerEmail,
  });

  if (error) {
    throw new Error(`reconcile_store_order_payment: ${error.message}`);
  }

  const result = data as Record<string, unknown>;
  return {
    outcome: result.outcome as ReconcileResult["outcome"],
    orderId: String(result.order_id ?? input.orderId),
    orderStatus: result.order_status as string | undefined,
    paymentStatus: result.payment_status as string | undefined,
    transactionId: result.transaction_id as string | undefined,
    reason: result.reason as string | undefined,
  };
}

export async function fetchAndReconcileMercadoPagoPayment(
  paymentId: string,
): Promise<ReconcileResult> {
  const payment = await getMercadoPagoPayment(paymentId);
  const orderId = resolveOrderIdFromPayment(payment);

  if (!orderId) {
    return {
      outcome: RECONCILE_OUTCOME.REFERENCE_MISMATCH,
      orderId: "",
    };
  }

  return reconcileStorePayment({ orderId, payment });
}

export async function recordStorePreferenceTransaction(input: {
  orderId: string;
  preferenceId: string;
  amount: number;
  externalReference: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.rpc("reconcile_store_order_payment", {
    p_order_id: input.orderId,
    p_provider: PAYMENT_PROVIDER.MERCADOPAGO,
    p_provider_payment_id: null,
    p_provider_preference_id: input.preferenceId,
    p_external_reference: input.externalReference,
    p_amount: input.amount,
    p_currency: "ARS",
    p_provider_status: "preference_created",
    p_status_detail: null,
    p_payer_email: null,
  });
}
