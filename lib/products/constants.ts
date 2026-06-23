export const PRODUCT_UNITS = [
  "unidad",
  "botella",
  "lata",
  "porción",
  "vaso",
  "caja",
  "combo",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const STOCK_ADJUSTMENT_TYPES = [
  { value: "restock", label: "Reposición" },
  { value: "manual_increase", label: "Corrección positiva" },
  { value: "manual_decrease", label: "Corrección negativa" },
  { value: "damage", label: "Rotura" },
  { value: "loss", label: "Pérdida" },
  { value: "internal_consumption", label: "Consumo interno" },
  { value: "correction", label: "Corrección general" },
] as const;

export type StockAdjustmentType =
  (typeof STOCK_ADJUSTMENT_TYPES)[number]["value"];

export const MAX_PER_ORDER_ERROR_CODE = "max_per_order_exceeded";

export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  restock: "Reposición",
  manual_increase: "Corrección positiva",
  manual_decrease: "Corrección negativa",
  damage: "Rotura",
  loss: "Pérdida",
  internal_consumption: "Consumo interno",
  correction: "Corrección general",
  reservation: "Reserva",
  reservation_release: "Liberación de reserva",
  sale: "Venta directa",
  sale_confirmation: "Confirmación de venta",
  sale_cancellation: "Devolución por cancelación",
};
