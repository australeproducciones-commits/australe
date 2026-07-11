import { getMercadoPagoConfig, getSiteUrl } from "@/lib/payments/config";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  ProviderPayment,
  ProviderPaymentStatus,
} from "@/lib/payments/types";
import { PROVIDER_PAYMENT_STATUS } from "@/lib/payments/types";

const MP_API_BASE = "https://api.mercadopago.com";

type MpPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
  expiration_date_to?: string;
};

type MpPaymentResponse = {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  preference_id?: string;
  payer?: { email?: string };
  date_approved?: string;
};

/**
 * Medios offline/inmediatos incompatibles con reserva de 30 minutos.
 * @see https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/checkout-customization/preferences
 */
export const MERCADOPAGO_EXCLUDED_OFFLINE_TYPES = [
  { id: "ticket" },
  { id: "atm" },
] as const;

export function mapMercadoPagoPaymentStatus(
  status: string | null | undefined,
): ProviderPaymentStatus | "unknown" {
  switch (status) {
    case "approved":
      return PROVIDER_PAYMENT_STATUS.APPROVED;
    case "pending":
      return PROVIDER_PAYMENT_STATUS.PENDING;
    case "in_process":
      return PROVIDER_PAYMENT_STATUS.IN_PROCESS;
    case "rejected":
      return PROVIDER_PAYMENT_STATUS.REJECTED;
    case "cancelled":
      return PROVIDER_PAYMENT_STATUS.CANCELLED;
    case "refunded":
      return PROVIDER_PAYMENT_STATUS.REFUNDED;
    case "charged_back":
      return PROVIDER_PAYMENT_STATUS.CHARGED_BACK;
    default:
      return "unknown";
  }
}

async function mpFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { accessToken } = getMercadoPagoConfig();
  if (!accessToken) {
    throw new Error("Mercado Pago no configurado.");
  }

  const response = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Mercado Pago API ${response.status}: ${body.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

export async function createMercadoPagoCheckout(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const siteUrl = getSiteUrl();
  const notificationUrl = `${siteUrl}/api/webhooks/mercadopago`;

  const body = {
    items: input.items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      currency_id: item.currency_id,
    })),
    payer: input.payerEmail ? { email: input.payerEmail } : undefined,
    back_urls: {
      success: `${siteUrl}/tienda/pago/exito?pedido=${encodeURIComponent(input.orderNumber)}`,
      pending: `${siteUrl}/tienda/pago/pendiente?pedido=${encodeURIComponent(input.orderNumber)}`,
      failure: `${siteUrl}/tienda/pago/error?pedido=${encodeURIComponent(input.orderNumber)}`,
    },
    auto_return: "approved",
    external_reference: input.externalReference,
    notification_url: notificationUrl,
    expires: true,
    expiration_date_to: input.expiresAt.toISOString(),
    payment_methods: {
      excluded_payment_types: [...MERCADOPAGO_EXCLUDED_OFFLINE_TYPES],
    },
    metadata: {
      module: input.module,
      order_id: input.orderId,
      order_number: input.orderNumber,
      ...(input.metadata ?? {}),
    },
  };

  const preference = await mpFetch<MpPreferenceResponse>("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const { environment } = getMercadoPagoConfig();
  const initPoint =
    environment === "test" && preference.sandbox_init_point
      ? preference.sandbox_init_point
      : preference.init_point;

  return {
    preferenceId: preference.id,
    initPoint,
    sandboxInitPoint: preference.sandbox_init_point,
  };
}

export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<ProviderPayment> {
  const payment = await mpFetch<MpPaymentResponse>(`/v1/payments/${paymentId}`);

  return {
    id: String(payment.id),
    status: payment.status,
    statusDetail: payment.status_detail ?? null,
    externalReference: payment.external_reference ?? null,
    transactionAmount: Number(payment.transaction_amount ?? 0),
    currencyId: payment.currency_id ?? "ARS",
    preferenceId: payment.preference_id ?? null,
    payerEmail: payment.payer?.email ?? null,
    dateApproved: payment.date_approved ?? null,
  };
}

export async function getMercadoPagoPreference(preferenceId: string) {
  return mpFetch<MpPreferenceResponse>(`/checkout/preferences/${preferenceId}`);
}

import { verifyMercadoPagoSignature } from "@/lib/payments/signature";

export function validateMercadoPagoWebhook(input: {
  dataId: string | null;
  requestId: string | null;
  signatureHeader: string | null;
}): { valid: boolean; error?: string } {
  const { webhookSecret } = getMercadoPagoConfig();
  return verifyMercadoPagoSignature({
    ...input,
    secret: webhookSecret,
  });
}
