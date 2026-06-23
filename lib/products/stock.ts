export function computeStockAvailable(
  stockOnHand: number,
  stockReserved: number,
): number {
  return Math.max(0, stockOnHand - stockReserved);
}

export function isLowStock(
  stockAvailable: number,
  threshold: number | null | undefined,
): boolean {
  if (threshold == null || threshold <= 0) {
    return false;
  }
  return stockAvailable <= threshold;
}
