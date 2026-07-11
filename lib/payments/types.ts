export const PAYMENT_MODULE = {
  STORE: "store",
} as const;

export type PaymentModule = (typeof PAYMENT_MODULE)[keyof typeof PAYMENT_MODULE];

export const PAYMENT_PROVIDER = {
  MERCADOPAGO: "mercadopago",
  MANUAL: "manual",
} as const;

export type PaymentProvider =
  (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export const PROVIDER_PAYMENT_STATUS = {
  APPROVED: "approved",
  PENDING: "pending",
  IN_PROCESS: "in_process",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  CHARGED_BACK: "charged_back",
} as const;

export type ProviderPaymentStatus =
  (typeof PROVIDER_PAYMENT_STATUS)[keyof typeof PROVIDER_PAYMENT_STATUS];

export const RECONCILE_OUTCOME = {
  CONFIRMED: "confirmed",
  ALREADY_CONFIRMED: "already_confirmed",
  PAYMENT_REVIEW: "payment_review",
  PENDING: "pending",
  REJECTED: "rejected",
  REFUNDED: "refunded",
  CHARGED_BACK: "charged_back",
  AMOUNT_MISMATCH: "amount_mismatch",
  CURRENCY_MISMATCH: "currency_mismatch",
  REFERENCE_MISMATCH: "reference_mismatch",
  ORDER_NOT_FOUND: "order_not_found",
  INVALID_STATE: "invalid_state",
  IGNORED: "ignored",
} as const;

export type ReconcileOutcome =
  (typeof RECONCILE_OUTCOME)[keyof typeof RECONCILE_OUTCOME];

export type PaymentTransaction = {
  id: string;
  provider: string;
  module: string;
  order_id: string;
  provider_preference_id: string | null;
  provider_payment_id: string | null;
  external_reference: string;
  status: string;
  status_detail: string | null;
  amount: number;
  currency: string;
  payer_email: string | null;
  approved_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentWebhookEvent = {
  id: string;
  provider: string;
  provider_event_id: string | null;
  request_id: string | null;
  topic: string | null;
  resource_id: string | null;
  payload_hash: string;
  processing_status: string;
  attempts: number;
  processed_at: string | null;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type CheckoutItem = {
  id: string;
  title: string;
  description?: string;
  quantity: number;
  unit_price: number;
  currency_id: string;
};

export type CreateCheckoutInput = {
  module: PaymentModule;
  orderId: string;
  orderNumber: string;
  externalReference: string;
  items: CheckoutItem[];
  total: number;
  currency: string;
  payerEmail?: string | null;
  expiresAt: Date;
  metadata?: Record<string, string>;
};

export type CreateCheckoutResult = {
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint?: string;
};

export type ProviderPayment = {
  id: string;
  status: string;
  statusDetail: string | null;
  externalReference: string | null;
  transactionAmount: number;
  currencyId: string;
  preferenceId: string | null;
  payerEmail: string | null;
  dateApproved: string | null;
};

export type ReconcileResult = {
  outcome: ReconcileOutcome;
  orderId: string;
  orderStatus?: string;
  paymentStatus?: string;
  transactionId?: string;
  reason?: string;
};

export type WebhookValidationInput = {
  dataId: string | null;
  requestId: string | null;
  signatureHeader: string | null;
  secret: string;
};

export type WebhookValidationResult = {
  valid: boolean;
  error?: string;
};
