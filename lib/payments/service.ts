import {
  assertMercadoPagoConfigured,
  buildStoreExternalReference,
  getMercadoPagoConfig,
  isMercadoPagoEnabled,
} from "@/lib/payments/config";
import {
  createMercadoPagoCheckout,
  getMercadoPagoPayment,
  getMercadoPagoPreference,
  mapMercadoPagoPaymentStatus,
  validateMercadoPagoWebhook,
} from "@/lib/payments/providers/mercadopago";
import {
  fetchAndReconcileMercadoPagoPayment,
  reconcileStorePayment,
  registerWebhookEvent,
} from "@/lib/payments/reconciliation";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  ProviderPayment,
  ReconcileResult,
} from "@/lib/payments/types";
import { PAYMENT_MODULE, PAYMENT_PROVIDER } from "@/lib/payments/types";

export const paymentService = {
  isEnabled(): boolean {
    return isMercadoPagoEnabled();
  },

  getPublicConfig() {
    const config = getMercadoPagoConfig();
    return {
      enabled: config.isEnabled,
      publicKey: config.publicKey,
      environment: config.environment,
    };
  },

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    assertMercadoPagoConfigured();
    return createMercadoPagoCheckout(input);
  },

  async getPayment(paymentId: string): Promise<ProviderPayment> {
    assertMercadoPagoConfigured();
    return getMercadoPagoPayment(paymentId);
  },

  async getPreference(preferenceId: string) {
    assertMercadoPagoConfigured();
    return getMercadoPagoPreference(preferenceId);
  },

  validateWebhook(input: {
    dataId: string | null;
    requestId: string | null;
    signatureHeader: string | null;
  }) {
    return validateMercadoPagoWebhook(input);
  },

  mapPaymentStatus: mapMercadoPagoPaymentStatus,

  buildExternalReference(orderId: string): string {
    return buildStoreExternalReference(orderId);
  },

  async reconcileMercadoPagoPayment(paymentId: string): Promise<ReconcileResult> {
    assertMercadoPagoConfigured();
    return fetchAndReconcileMercadoPagoPayment(paymentId);
  },

  async reconcileStorePayment(input: {
    orderId: string;
    payment: ProviderPayment;
    preferenceId?: string | null;
  }): Promise<ReconcileResult> {
    return reconcileStorePayment(input);
  },

  async registerWebhookEvent(input: {
    requestId: string | null;
    topic: string | null;
    resourceId: string | null;
    payloadHash: string;
  }) {
    return registerWebhookEvent({
      provider: PAYMENT_PROVIDER.MERCADOPAGO,
      ...input,
    });
  },

  module: PAYMENT_MODULE,
  provider: PAYMENT_PROVIDER,
};
