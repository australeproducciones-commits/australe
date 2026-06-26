const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const currencyDetailedFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("es-AR");

export function formatDashboardCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatDashboardCurrencyDetailed(value: number): string {
  return currencyDetailedFormatter.format(value);
}

export function formatDashboardNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatDashboardPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toLocaleString("es-AR")}%`;
}

export function formatShortDayLabel(ymd: string): string {
  const [year, month, day] = ymd.split("-");
  const date = new Date(`${year}-${month}-${day}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatTrendLabel(percent: number | null): string | null {
  if (percent == null || Number.isNaN(percent)) {
    return null;
  }

  return formatDashboardPercent(percent);
}
