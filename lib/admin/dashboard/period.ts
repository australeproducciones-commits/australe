import type { DashboardFilters, DashboardPeriod, DateRange } from "@/lib/admin/dashboard/types";
import { EVENT_TIMEZONE } from "@/lib/events/eventTiming";

function startOfDayInTz(date: Date, timeZone: string): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return new Date(`${ymd}T00:00:00-03:00`);
}

function endOfDayInTz(date: Date, timeZone: string): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  return new Date(`${ymd}T23:59:59.999-03:00`);
}

export function parseDashboardFilters(searchParams: {
  period?: string;
  event?: string;
  from?: string;
  to?: string;
}): DashboardFilters {
  const period = isValidPeriod(searchParams.period)
    ? searchParams.period
    : "30d";

  return {
    period,
    eventId: searchParams.event?.trim() || null,
    customFrom: searchParams.from?.trim() || null,
    customTo: searchParams.to?.trim() || null,
  };
}

function isValidPeriod(value: string | undefined): value is DashboardPeriod {
  return (
    value === "all" ||
    value === "today" ||
    value === "7d" ||
    value === "30d" ||
    value === "month" ||
    value === "custom"
  );
}

export function getDateRangeForPeriod(
  filters: DashboardFilters,
  now: Date = new Date(),
): DateRange {
  const to = endOfDayInTz(now, EVENT_TIMEZONE);

  switch (filters.period) {
    case "all":
      return { from: null, to };
    case "today": {
      const from = startOfDayInTz(now, EVENT_TIMEZONE);
      return { from, to };
    }
    case "7d": {
      const from = new Date(to);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from: startOfDayInTz(from, EVENT_TIMEZONE), to };
    }
    case "30d": {
      const from = new Date(to);
      from.setDate(from.getDate() - 29);
      return { from: startOfDayInTz(from, EVENT_TIMEZONE), to };
    }
    case "month": {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: EVENT_TIMEZONE,
        year: "numeric",
        month: "2-digit",
      }).formatToParts(now);

      const year = parts.find((p) => p.type === "year")?.value ?? "2026";
      const month = parts.find((p) => p.type === "month")?.value ?? "01";
      const from = new Date(`${year}-${month}-01T00:00:00-03:00`);
      return { from, to };
    }
    case "custom": {
      const from = filters.customFrom
        ? new Date(`${filters.customFrom}T00:00:00-03:00`)
        : null;
      const customTo = filters.customTo
        ? new Date(`${filters.customTo}T23:59:59.999-03:00`)
        : to;
      return { from, to: customTo };
    }
    default:
      return { from: null, to };
  }
}

export function getPeriodLabel(filters: DashboardFilters): string {
  switch (filters.period) {
    case "all":
      return "Todo el período";
    case "today":
      return "Hoy";
    case "7d":
      return "Últimos 7 días";
    case "30d":
      return "Últimos 30 días";
    case "month":
      return "Este mes";
    case "custom":
      if (filters.customFrom && filters.customTo) {
        return `${filters.customFrom} — ${filters.customTo}`;
      }
      return "Período personalizado";
    default:
      return "Período";
  }
}

export function isTimestampInRange(
  iso: string,
  range: DateRange,
): boolean {
  const ts = new Date(iso).getTime();
  if (range.from && ts < range.from.getTime()) {
    return false;
  }
  return ts <= range.to.getTime();
}

export function formatDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dayKeyFromIso(iso: string): string {
  return formatDayKey(new Date(iso));
}
