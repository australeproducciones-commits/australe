export const PAYMENT_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  REFUNDED: "refunded",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.PENDING]: "Pendiente",
  [PAYMENT_STATUS.APPROVED]: "Aprobado",
  [PAYMENT_STATUS.REJECTED]: "Rechazado",
  [PAYMENT_STATUS.REFUNDED]: "Reembolsado",
};

export const PAYMENT_METHODS = {
  CASH: "cash",
  TRANSFER: "transfer",
  MERCADO_PAGO: "mercado_pago",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PAYMENT_METHODS.CASH]: "Efectivo",
  [PAYMENT_METHODS.TRANSFER]: "Transferencia",
  [PAYMENT_METHODS.MERCADO_PAGO]: "Mercado Pago",
};
