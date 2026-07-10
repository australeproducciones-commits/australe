import type { AdminDashboardData } from "@/lib/admin/dashboard/types";

export type DashboardMetricTone = "green" | "yellow" | "red" | "blue" | "neutral";

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  sublabel?: string;
  tone: DashboardMetricTone;
  badge?: string;
  trendPercent: number | null;
  sparkline: number[];
};

export type OperationalStatusRow = {
  id: string;
  label: string;
  value: string | number;
  tone: DashboardMetricTone;
};

export type ConversionFunnelStep = {
  id: string;
  label: string;
  value: number;
  rateFromPrevious: number | null;
};

export function computeSeriesTrend(values: number[]): number | null {
  if (values.length < 2) {
    return null;
  }

  const midpoint = Math.floor(values.length / 2);
  const first = values.slice(0, midpoint).reduce((sum, v) => sum + v, 0);
  const second = values.slice(midpoint).reduce((sum, v) => sum + v, 0);

  if (first === 0) {
    return second > 0 ? 100 : null;
  }

  return Math.round(((second - first) / first) * 100);
}

export function buildDashboardKpis(data: AdminDashboardData): DashboardKpi[] {
  const { revenue, tickets, kiosk, traffic, alerts, pendingSales } = data;
  const revenueSpark = data.revenueSeries.map((point) => point.total);
  const trafficSpark = data.trafficSeries.map((point) => point.visits);
  const ticketsSpark = data.revenueSeries.map((point) => point.tickets);

  const conversionRate =
    traffic.available && traffic.uniqueVisitors > 0
      ? Math.round((tickets.soldConfirmed / traffic.uniqueVisitors) * 1000) / 10
      : null;

  return [
    {
      id: "revenue",
      label: "Recaudación",
      value: formatMetricCurrency(revenue.total),
      sublabel:
        revenue.total > 0
          ? `Hoy en período · 7d: ${formatMetricCurrency(data.revenue7d)}`
          : "Sin ventas confirmadas",
      tone: revenue.total > 0 ? "green" : "neutral",
      badge: revenue.pending > 0 ? "Pendiente" : undefined,
      trendPercent: computeSeriesTrend(revenueSpark),
      sparkline: revenueSpark,
    },
    {
      id: "tickets",
      label: "Entradas vendidas",
      value:
        tickets.stockTotal != null
          ? `${formatMetricNumber(tickets.soldConfirmed)} / ${formatMetricNumber(tickets.stockTotal)}`
          : formatMetricNumber(tickets.soldConfirmed),
      sublabel:
        tickets.pendingConfirmation > 0
          ? `${formatMetricNumber(tickets.pendingConfirmation)} reservas pendientes`
          : tickets.soldPercent != null
            ? `${tickets.soldPercent}% del stock`
            : "Sin capacidad total definida",
      tone:
        tickets.pendingConfirmation > 0
          ? "yellow"
          : tickets.soldConfirmed > 0
            ? "green"
            : "neutral",
      badge: tickets.pendingConfirmation > 0 ? "Pendiente" : undefined,
      trendPercent: computeSeriesTrend(ticketsSpark),
      sparkline: ticketsSpark,
    },
    {
      id: "kiosk",
      label: "Consumiciones",
      value: formatMetricCurrency(kiosk.revenue),
      sublabel:
        kiosk.ordersConfirmed > 0
          ? `${formatMetricNumber(kiosk.productsSold)} productos · ${formatMetricNumber(kiosk.ordersConfirmed)} órdenes`
          : "Sin órdenes confirmadas",
      tone:
        kiosk.lowStockProducts > 0
          ? "yellow"
          : kiosk.ordersConfirmed > 0
            ? "green"
            : "neutral",
      badge: kiosk.lowStockProducts > 0 ? "Stock bajo" : undefined,
      trendPercent: null,
      sparkline: data.revenueSeries.map((point) => point.kiosk),
    },
    {
      id: "traffic",
      label: "Tráfico",
      value: traffic.available
        ? `${formatMetricNumber(traffic.totalVisits)} visitas`
        : "—",
      sublabel: traffic.available
        ? `${formatMetricNumber(traffic.uniqueVisitors)} únicos · Hoy: ${formatMetricNumber(traffic.visitsToday)}`
        : "Analítica no disponible",
      tone: traffic.available && traffic.totalVisits > 0 ? "blue" : "neutral",
      trendPercent: traffic.visitsChangePercent,
      sparkline: trafficSpark,
    },
    {
      id: "conversion",
      label: "Conversión",
      value:
        conversionRate != null ? `${conversionRate.toLocaleString("es-AR")}%` : "—",
      sublabel:
        traffic.available && tickets.soldConfirmed > 0
          ? `${formatMetricNumber(tickets.soldConfirmed)} ventas confirmadas`
          : "Sin datos suficientes",
      tone:
        conversionRate != null && conversionRate >= 5
          ? "green"
          : conversionRate != null
            ? "yellow"
            : "neutral",
      trendPercent: null,
      sparkline: [],
    },
    {
      id: "attention",
      label: "Necesita atención",
      value: formatMetricNumber(alerts.length + (pendingSales.totalOperations > 0 ? 1 : 0)),
      sublabel:
        pendingSales.totalOperations > 0
          ? `${formatMetricNumber(pendingSales.totalOperations)} ventas por confirmar`
          : alerts.length > 0
            ? `${formatMetricNumber(alerts.length)} alertas activas`
            : "Todo en orden",
      tone:
        alerts.some((a) => a.severity === "high") || pendingSales.totalOperations > 0
          ? "red"
          : alerts.length > 0
            ? "yellow"
            : "green",
      badge:
        alerts.some((a) => a.severity === "high")
          ? "Crítico"
          : alerts.length > 0
            ? "Revisar"
            : "OK",
      trendPercent: null,
      sparkline: [],
    },
  ];
}

export function buildOperationalStatusRows(
  data: AdminDashboardData,
): OperationalStatusRow[] {
  const activeEvents = data.upcomingEvents.filter(
    (row) => row.timing.isInProgress,
  ).length;
  const upcomingEvents = data.upcomingEvents.filter(
    (row) => row.timing.isUpcoming,
  ).length;
  const onlineSalesEnabled = data.upcomingEvents.filter(
    (row) => row.event.sale_web_enabled,
  ).length;
  const configIssues = data.alerts.filter(
    (alert) =>
      alert.title.includes("configur") ||
      alert.title.includes("Sin entradas") ||
      alert.title.includes("sin imagen") ||
      alert.title.includes("sin lugar"),
  ).length;

  return [
    {
      id: "active-events",
      label: "Eventos activos",
      value: activeEvents,
      tone: activeEvents > 0 ? "green" : "neutral",
    },
    {
      id: "upcoming-events",
      label: "Eventos próximos",
      value: upcomingEvents,
      tone: "blue",
    },
    {
      id: "online-sales",
      label: "Ventas online habilitadas",
      value: onlineSalesEnabled,
      tone: onlineSalesEnabled > 0 ? "green" : "yellow",
    },
    {
      id: "kiosk-orders",
      label: "Consumiciones pendientes",
      value: data.kiosk.ordersPending,
      tone: data.kiosk.ordersPending > 0 ? "yellow" : "neutral",
    },
    {
      id: "pending-reservations",
      label: "Reservas pendientes",
      value: data.tickets.pendingConfirmation,
      tone: data.tickets.pendingConfirmation > 0 ? "yellow" : "neutral",
    },
    {
      id: "pending-sales",
      label: "Ventas por confirmar",
      value: data.pendingSales.totalOperations,
      tone: data.pendingSales.totalOperations > 0 ? "red" : "green",
    },
    {
      id: "low-stock",
      label: "Productos con stock bajo",
      value: data.kiosk.lowStockProducts,
      tone: data.kiosk.lowStockProducts > 0 ? "yellow" : "green",
    },
    {
      id: "config-issues",
      label: "Problemas de configuración",
      value: configIssues,
      tone: configIssues > 0 ? "red" : "green",
    },
  ];
}

export function buildConversionFunnel(
  data: AdminDashboardData,
): ConversionFunnelStep[] {
  if (!data.traffic.available) {
    return [];
  }

  const visits = data.traffic.totalVisits;
  const eventViews = data.topEventsByViews.reduce(
    (sum, row) => sum + row.visits,
    0,
  );
  const purchaseStarts = data.topEventsByViews.reduce(
    (sum, row) => sum + row.ticketClicks,
    0,
  );
  const confirmedSales = data.tickets.soldConfirmed;

  const steps: ConversionFunnelStep[] = [
    {
      id: "visits",
      label: "Visitas",
      value: visits,
      rateFromPrevious: null,
    },
    {
      id: "event-views",
      label: "Vistas de eventos",
      value: eventViews > 0 ? eventViews : visits,
      rateFromPrevious: visits > 0 ? (eventViews / visits) * 100 : null,
    },
    {
      id: "purchase-started",
      label: "Compras iniciadas",
      value: purchaseStarts,
      rateFromPrevious:
        eventViews > 0 ? (purchaseStarts / eventViews) * 100 : null,
    },
    {
      id: "purchase-completed",
      label: "Ventas confirmadas",
      value: confirmedSales,
      rateFromPrevious:
        purchaseStarts > 0 ? (confirmedSales / purchaseStarts) * 100 : null,
    },
  ];

  return steps.filter((step) => step.value > 0 || step.id === "visits");
}

function formatMetricCurrency(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMetricNumber(value: number): string {
  return value.toLocaleString("es-AR");
}
