export const STORE_PAYMENT_CHANNEL = {
  MERCADOPAGO: "mercadopago",
  MANUAL: "manual",
} as const;

export type StorePaymentChannel =
  (typeof STORE_PAYMENT_CHANNEL)[keyof typeof STORE_PAYMENT_CHANNEL];

export const STORE_MANUAL_PAYMENT_METHOD = {
  CASH: "cash",
  BANK_TRANSFER: "bank_transfer",
  CARD_TERMINAL: "card_terminal",
  OTHER: "other",
} as const;

export type StoreManualPaymentMethod =
  (typeof STORE_MANUAL_PAYMENT_METHOD)[keyof typeof STORE_MANUAL_PAYMENT_METHOD];

export const STORE_MANUAL_PAYMENT_METHOD_LABELS: Record<StoreManualPaymentMethod, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card_terminal: "Tarjeta presencial",
  other: "Otro",
};

export const STORE_PAYMENT_CHANNEL_LABELS: Record<StorePaymentChannel, string> = {
  mercadopago: "Mercado Pago",
  manual: "Pago en caja",
};

export function isStorePaymentChannel(value: string): value is StorePaymentChannel {
  return value === STORE_PAYMENT_CHANNEL.MERCADOPAGO || value === STORE_PAYMENT_CHANNEL.MANUAL;
}

export function isStoreManualPaymentMethod(value: string): value is StoreManualPaymentMethod {
  return Object.values(STORE_MANUAL_PAYMENT_METHOD).includes(value as StoreManualPaymentMethod);
}
