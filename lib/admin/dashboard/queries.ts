import type {
  ActivityItem,
  AdminDashboardData,
  AlertItem,
  DailyRevenuePoint,
  DailyTrafficPoint,
  DashboardFilters,
  EventDashboardRow,
  EventTrafficRow,
  KioskSummary,
  RevenueBreakdown,
  TicketSummary,
  TrafficSummary,
} from "@/lib/admin/dashboard/types";
import {
  dayKeyFromIso,
  formatDayKey,
  getDateRangeForPeriod,
  getPeriodLabel,
  isTimestampInRange,
} from "@/lib/admin/dashboard/period";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import { ROUTES } from "@/lib/constants/routes";
import {
  compareEventsBySchedule,
  getEventTiming,
} from "@/lib/events/eventTiming";
import { getFinancialSummariesByEventIds } from "@/lib/finance/queries";
import { getPendingSalesSummary } from "@/lib/ticket-sales/pendingSales";
import { getAllEventsForAdmin, requireAdminPage } from "@/lib/events/queries";
import type { Event } from "@/lib/events/types";
import type { EventFinancialSummary } from "@/lib/finance/types";
import { KIOSK_ORDER_PAYMENT_STATUS } from "@/lib/kiosk/types";
import {
  isCancelledOrExpiredTicket,
  isConfirmedSale,
  isPendingReservation,
} from "@/lib/ticket-sales/saleStatus";
import { SALES_CHANNEL } from "@/lib/ticket-sales/types";

type TicketRow = {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  ticket_status: string;
  payment_status: string;
  price_paid: number;
  sales_channel: string;
  created_at: string;
  updated_at: string;
  reservation_expires_at: string | null;
  used_at: string | null;
  cancelled_at: string | null;
};

type TicketTypeRow = {
  event_id: string;
  stock_total: number | null;
  stock_sold: number;
  is_active: boolean;
  name: string;
};

type KioskOrderRow = {
  id: string;
  event_id: string;
  payment_status: string;
  total_amount: number;
  source: string;
  created_at: string;
  paid_at: string | null;
};

type KioskItemRow = {
  order_id: string;
  quantity: number;
};

type KioskProductRow = {
  event_id: string;
  stock_total: number | null;
  stock_sold: number;
  is_available: boolean;
};

type AnalyticsRow = {
  id: string;
  event_name: string;
  page_path: string;
  event_id: string | null;
  ticket_type_id: string | null;
  session_id: string;
  visitor_id: string;
  created_at: string;
};

const LOW_STOCK_THRESHOLD = 5;
const RESERVATION_ALERT_HOURS = 24;

function emptyFinancial(): EventFinancialSummary {
  return {
    revenueTickets: 0,
    revenueKiosk: 0,
    revenueManual: 0,
    revenueOtherCollected: 0,
    revenueConfirmed: 0,
    revenuePending: 0,
    expensesPaid: 0,
    expensesCommitted: 0,
    expensesEstimated: 0,
    realProfit: 0,
    projectedProfit: 0,
    profitMarginPercent: null,
    profitVisualState: "incomplete",
    profitBadgeLabel: "Datos incompletos",
    pendingSalesCount: 0,
  };
}

function aggregateGlobalFinancial(
  financialMap: Map<string, EventFinancialSummary>,
) {
  let revenueConfirmed = 0;
  let revenuePending = 0;
  let expensesPaid = 0;
  let expensesCommitted = 0;
  let realProfit = 0;
  let projectedProfit = 0;

  for (const summary of financialMap.values()) {
    revenueConfirmed += summary.revenueConfirmed;
    revenuePending += summary.revenuePending;
    expensesPaid += summary.expensesPaid;
    expensesCommitted += summary.expensesCommitted;
    realProfit += summary.realProfit;
    projectedProfit += summary.projectedProfit;
  }

  return {
    revenueConfirmed,
    revenuePending,
    expensesPaid,
    expensesCommitted,
    realProfit,
    projectedProfit,
  };
}

function revenueTimestamp(ticket: TicketRow): string {
  return ticket.updated_at || ticket.created_at;
}

function kioskRevenueTimestamp(order: KioskOrderRow): string {
  return order.paid_at || order.created_at;
}

function buildTicketSummary(
  tickets: TicketRow[],
  ticketTypes: TicketTypeRow[],
  eventFilter: string | null,
  range: ReturnType<typeof getDateRangeForPeriod>,
): TicketSummary {
  let soldConfirmed = 0;
  let pendingConfirmation = 0;
  let used = 0;
  let cancelled = 0;
  let stockTotal: number | null = 0;
  let hasUndefinedStock = false;

  const typesForStock = eventFilter
    ? ticketTypes.filter((t) => t.event_id === eventFilter)
    : ticketTypes;

  for (const type of typesForStock) {
    if (type.stock_total === null) {
      hasUndefinedStock = true;
      continue;
    }
    stockTotal = (stockTotal ?? 0) + type.stock_total;
  }

  if (hasUndefinedStock && stockTotal === 0) {
    stockTotal = null;
  }

  for (const ticket of tickets) {
    if (eventFilter && ticket.event_id !== eventFilter) {
      continue;
    }

    if (!isTimestampInRange(revenueTimestamp(ticket), range)) {
      continue;
    }

    if (isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      soldConfirmed += 1;
      if (ticket.ticket_status === "used") {
        used += 1;
      }
    } else if (
      isPendingReservation(ticket.ticket_status, ticket.payment_status)
    ) {
      pendingConfirmation += 1;
    } else if (
      isCancelledOrExpiredTicket(ticket.ticket_status, ticket.payment_status)
    ) {
      cancelled += 1;
    }
  }

  const soldPercent =
    stockTotal != null && stockTotal > 0
      ? Math.min(100, Math.round((soldConfirmed / stockTotal) * 100))
      : null;

  return {
    soldConfirmed,
    stockTotal,
    hasUndefinedStock,
    soldPercent,
    pendingConfirmation,
    used,
    cancelled,
  };
}

function buildRevenue(
  tickets: TicketRow[],
  kioskOrders: KioskOrderRow[],
  eventFilter: string | null,
  range: ReturnType<typeof getDateRangeForPeriod>,
): RevenueBreakdown {
  let ticketsRevenue = 0;
  let kioskRevenue = 0;
  let manualRevenue = 0;
  let pending = 0;

  for (const ticket of tickets) {
    if (eventFilter && ticket.event_id !== eventFilter) {
      continue;
    }

    if (isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      if (!isTimestampInRange(revenueTimestamp(ticket), range)) {
        continue;
      }

      const amount = Number(ticket.price_paid) || 0;
      ticketsRevenue += amount;

      if (
        ticket.sales_channel === SALES_CHANNEL.ADMIN_MANUAL ||
        ticket.sales_channel === SALES_CHANNEL.DOOR
      ) {
        manualRevenue += amount;
      }
    } else if (
      isPendingReservation(ticket.ticket_status, ticket.payment_status)
    ) {
      if (!isTimestampInRange(ticket.created_at, range)) {
        continue;
      }
      pending += Number(ticket.price_paid) || 0;
    }
  }

  for (const order of kioskOrders) {
    if (eventFilter && order.event_id !== eventFilter) {
      continue;
    }

    if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID) {
      if (!isTimestampInRange(kioskRevenueTimestamp(order), range)) {
        continue;
      }
      kioskRevenue += Number(order.total_amount) || 0;
    } else if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PENDING) {
      if (!isTimestampInRange(order.created_at, range)) {
        continue;
      }
      pending += Number(order.total_amount) || 0;
    }
  }

  return {
    tickets: ticketsRevenue,
    kiosk: kioskRevenue,
    manual: manualRevenue,
    total: ticketsRevenue + kioskRevenue,
    pending,
  };
}

function sumRevenueForRange(
  tickets: TicketRow[],
  kioskOrders: KioskOrderRow[],
  eventFilter: string | null,
  range: ReturnType<typeof getDateRangeForPeriod>,
): number {
  return buildRevenue(tickets, kioskOrders, eventFilter, range).total;
}

function buildKioskSummary(
  kioskOrders: KioskOrderRow[],
  kioskItems: KioskItemRow[],
  kioskProducts: KioskProductRow[],
  eventFilter: string | null,
  range: ReturnType<typeof getDateRangeForPeriod>,
): KioskSummary {
  const orderIdsInRange = new Set<string>();
  let ordersConfirmed = 0;
  let revenue = 0;
  let ordersPending = 0;

  for (const order of kioskOrders) {
    if (eventFilter && order.event_id !== eventFilter) {
      continue;
    }

    if (!isTimestampInRange(order.created_at, range)) {
      continue;
    }

    orderIdsInRange.add(order.id);

    if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID) {
      ordersConfirmed += 1;
      revenue += Number(order.total_amount) || 0;
    } else if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PENDING) {
      ordersPending += 1;
    }
  }

  let productsSold = 0;
  for (const item of kioskItems) {
    if (orderIdsInRange.has(item.order_id)) {
      productsSold += item.quantity;
    }
  }

  let lowStockProducts = 0;
  const products = eventFilter
    ? kioskProducts.filter((p) => p.event_id === eventFilter)
    : kioskProducts;

  for (const product of products) {
    if (!product.is_available || product.stock_total === null) {
      continue;
    }
    const remaining = product.stock_total - product.stock_sold;
    if (remaining >= 0 && remaining <= LOW_STOCK_THRESHOLD) {
      lowStockProducts += 1;
    }
  }

  return {
    ordersConfirmed,
    productsSold,
    revenue,
    ordersPending,
    lowStockProducts,
  };
}

function buildEventRow(
  event: Event,
  tickets: TicketRow[],
  ticketTypes: TicketTypeRow[],
  kioskOrders: KioskOrderRow[],
  analytics: AnalyticsRow[],
  financial: EventFinancialSummary,
  now: Date,
): EventDashboardRow {
  const timing = getEventTiming(
    event.event_date,
    event.start_time,
    event.end_time,
    now,
  );

  let ticketsSold = 0;
  let revenue = 0;
  let pendingReservations = 0;
  let stockTotal: number | null = 0;
  let hasUndefinedStock = false;

  for (const type of ticketTypes.filter((t) => t.event_id === event.id)) {
    if (type.stock_total === null) {
      hasUndefinedStock = true;
      continue;
    }
    stockTotal = (stockTotal ?? 0) + type.stock_total;
  }

  if (hasUndefinedStock && stockTotal === 0) {
    stockTotal = null;
  }

  for (const ticket of tickets.filter((t) => t.event_id === event.id)) {
    if (isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      ticketsSold += 1;
      revenue += Number(ticket.price_paid) || 0;
    } else if (
      isPendingReservation(ticket.ticket_status, ticket.payment_status)
    ) {
      pendingReservations += 1;
    }
  }

  let kioskRevenue = 0;
  for (const order of kioskOrders.filter((o) => o.event_id === event.id)) {
    if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID) {
      kioskRevenue += Number(order.total_amount) || 0;
    }
  }

  const eventAnalytics = analytics.filter(
    (a) =>
      a.event_id === event.id ||
      (a.page_path.includes(`/eventos/${event.slug}`) &&
        (a.event_name === "page_view" || a.event_name === "event_view")),
  );

  const visits = eventAnalytics.filter(
    (a) => a.event_name === "page_view" || a.event_name === "event_view",
  ).length;

  const uniqueVisitors = new Set(
    eventAnalytics
      .filter((a) => a.event_name === "page_view" || a.event_name === "event_view")
      .map((a) => a.visitor_id),
  ).size;

  const occupancyPercent =
    stockTotal != null && stockTotal > 0
      ? Math.min(100, Math.round((ticketsSold / stockTotal) * 100))
      : null;

  return {
    event,
    timing,
    ticketsSold,
    stockTotal,
    hasUndefinedStock,
    occupancyPercent,
    revenue,
    kioskRevenue,
    pendingReservations,
    visits,
    uniqueVisitors,
    financial,
  };
}

function buildRevenueSeries(
  tickets: TicketRow[],
  kioskOrders: KioskOrderRow[],
  eventFilter: string | null,
  range: ReturnType<typeof getDateRangeForPeriod>,
): DailyRevenuePoint[] {
  const map = new Map<string, DailyRevenuePoint>();

  const ensure = (day: string): DailyRevenuePoint => {
    const existing = map.get(day);
    if (existing) {
      return existing;
    }
    const point: DailyRevenuePoint = {
      date: day,
      tickets: 0,
      kiosk: 0,
      manual: 0,
      total: 0,
    };
    map.set(day, point);
    return point;
  };

  for (const ticket of tickets) {
    if (eventFilter && ticket.event_id !== eventFilter) {
      continue;
    }
    if (!isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      continue;
    }

    const ts = revenueTimestamp(ticket);
    if (!isTimestampInRange(ts, range)) {
      continue;
    }

    const day = dayKeyFromIso(ts);
    const point = ensure(day);
    const amount = Number(ticket.price_paid) || 0;
    point.tickets += amount;

    if (
      ticket.sales_channel === SALES_CHANNEL.ADMIN_MANUAL ||
      ticket.sales_channel === SALES_CHANNEL.DOOR
    ) {
      point.manual += amount;
    }
    point.total = point.tickets + point.kiosk;
  }

  for (const order of kioskOrders) {
    if (eventFilter && order.event_id !== eventFilter) {
      continue;
    }
    if (order.payment_status !== KIOSK_ORDER_PAYMENT_STATUS.PAID) {
      continue;
    }

    const ts = kioskRevenueTimestamp(order);
    if (!isTimestampInRange(ts, range)) {
      continue;
    }

    const day = dayKeyFromIso(ts);
    const point = ensure(day);
    point.kiosk += Number(order.total_amount) || 0;
    point.total = point.tickets + point.kiosk;
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildTrafficSummary(
  analytics: AnalyticsRow[],
  events: Event[],
  range: ReturnType<typeof getDateRangeForPeriod>,
  now: Date,
): TrafficSummary {
  if (analytics.length === 0) {
    return {
      available: false,
      totalVisits: 0,
      uniqueVisitors: 0,
      visitsToday: 0,
      visits7d: 0,
      visits30d: 0,
      visitsYesterday: 0,
      visitsChangePercent: null,
      topPagePath: null,
      topEventId: null,
      topEventName: null,
      conversionFormula:
        "compras confirmadas / visitantes únicos × 100",
    };
  }

  const pageViews = analytics.filter((a) => a.event_name === "page_view" || a.event_name === "event_view");
  const inRange = pageViews.filter((a) => isTimestampInRange(a.created_at, range));

  const todayKey = formatDayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatDayKey(yesterday);

  const visitsToday = pageViews.filter(
    (a) => dayKeyFromIso(a.created_at) === todayKey,
  ).length;

  const visitsYesterday = pageViews.filter(
    (a) => dayKeyFromIso(a.created_at) === yesterdayKey,
  ).length;

  const range7d = getDateRangeForPeriod({ period: "7d", eventId: null, customFrom: null, customTo: null }, now);
  const range30d = getDateRangeForPeriod({ period: "30d", eventId: null, customFrom: null, customTo: null }, now);

  const visits7d = pageViews.filter((a) =>
    isTimestampInRange(a.created_at, range7d),
  ).length;

  const visits30d = pageViews.filter((a) =>
    isTimestampInRange(a.created_at, range30d),
  ).length;

  const visitsChangePercent =
    visitsYesterday > 0
      ? Math.round(((visitsToday - visitsYesterday) / visitsYesterday) * 100)
      : visitsToday > 0
        ? 100
        : null;

  const pathCounts = new Map<string, number>();
  for (const row of inRange) {
    pathCounts.set(row.page_path, (pathCounts.get(row.page_path) ?? 0) + 1);
  }

  let topPagePath: string | null = null;
  let topPageCount = 0;
  for (const [path, count] of pathCounts) {
    if (count > topPageCount) {
      topPagePath = path;
      topPageCount = count;
    }
  }

  const eventViewCounts = new Map<string, number>();
  for (const row of inRange) {
    if (!row.event_id) {
      continue;
    }
    eventViewCounts.set(
      row.event_id,
      (eventViewCounts.get(row.event_id) ?? 0) + 1,
    );
  }

  let topEventId: string | null = null;
  let topEventCount = 0;
  for (const [eventId, count] of eventViewCounts) {
    if (count > topEventCount) {
      topEventId = eventId;
      topEventCount = count;
    }
  }

  const topEventName =
    topEventId != null
      ? events.find((e) => e.id === topEventId)?.name ?? null
      : null;

  return {
    available: true,
    totalVisits: inRange.length,
    uniqueVisitors: new Set(inRange.map((a) => a.visitor_id)).size,
    visitsToday,
    visits7d,
    visits30d,
    visitsYesterday,
    visitsChangePercent,
    topPagePath,
    topEventId,
    topEventName,
    conversionFormula: "compras confirmadas / visitantes únicos × 100",
  };
}

function buildTrafficSeries(
  analytics: AnalyticsRow[],
  range: ReturnType<typeof getDateRangeForPeriod>,
): DailyTrafficPoint[] {
  const map = new Map<string, DailyTrafficPoint>();
  const pageViews = analytics.filter(
    (a) => a.event_name === "page_view" || a.event_name === "event_view",
  );

  for (const row of pageViews) {
    if (!isTimestampInRange(row.created_at, range)) {
      continue;
    }

    const day = dayKeyFromIso(row.created_at);
    const existing = map.get(day) ?? {
      date: day,
      visits: 0,
      uniqueVisitors: 0,
    };
    existing.visits += 1;
    map.set(day, existing);
  }

  for (const point of map.values()) {
    const visitors = new Set(
      pageViews
        .filter((a) => dayKeyFromIso(a.created_at) === point.date)
        .map((a) => a.visitor_id),
    );
    point.uniqueVisitors = visitors.size;
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function buildTopEventsByViews(
  analytics: AnalyticsRow[],
  events: Event[],
  tickets: TicketRow[],
): EventTrafficRow[] {
  const byEvent = new Map<string, EventTrafficRow>();

  for (const event of events) {
    byEvent.set(event.id, {
      eventId: event.id,
      eventName: event.name,
      eventSlug: event.slug,
      visits: 0,
      uniqueVisitors: 0,
      ticketClicks: 0,
      confirmedPurchases: 0,
      conversionPercent: null,
    });
  }

  const visitorsByEvent = new Map<string, Set<string>>();

  for (const row of analytics) {
    if (!row.event_id) {
      continue;
    }

    const stats = byEvent.get(row.event_id);
    if (!stats) {
      continue;
    }

    if (row.event_name === "page_view" || row.event_name === "event_view") {
      stats.visits += 1;
      const set = visitorsByEvent.get(row.event_id) ?? new Set<string>();
      set.add(row.visitor_id);
      visitorsByEvent.set(row.event_id, set);
    } else if (row.event_name === "ticket_click") {
      stats.ticketClicks += 1;
    }
  }

  for (const ticket of tickets) {
    if (!isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      continue;
    }
    const stats = byEvent.get(ticket.event_id);
    if (stats) {
      stats.confirmedPurchases += 1;
    }
  }

  for (const [eventId, stats] of byEvent) {
    const visitors = visitorsByEvent.get(eventId);
    stats.uniqueVisitors = visitors?.size ?? 0;

    const denominator = stats.uniqueVisitors > 0 ? stats.uniqueVisitors : stats.visits;
    stats.conversionPercent =
      denominator > 0
        ? Math.round((stats.confirmedPurchases / denominator) * 1000) / 10
        : null;
  }

  return [...byEvent.values()]
    .filter((row) => row.visits > 0 || row.confirmedPurchases > 0)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 10);
}

function buildActivity(
  tickets: TicketRow[],
  kioskOrders: KioskOrderRow[],
  events: Event[],
  ticketTypes: TicketTypeRow[],
  range: ReturnType<typeof getDateRangeForPeriod>,
): ActivityItem[] {
  const eventName = (id: string) => events.find((e) => e.id === id)?.name ?? null;
  const items: ActivityItem[] = [];

  for (const ticket of tickets) {
    if (!isTimestampInRange(ticket.updated_at || ticket.created_at, range)) {
      continue;
    }

    if (isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      items.push({
        id: `ticket-sale-${ticket.id}`,
        type: "sale_confirmed",
        eventId: ticket.event_id,
        eventName: eventName(ticket.event_id),
        label: "Se confirmó una venta de entrada",
        amount: Number(ticket.price_paid) || 0,
        status: "confirmada",
        href: ROUTES.adminEventoVentas(ticket.event_id),
        createdAt: ticket.updated_at,
      });
    } else if (
      isPendingReservation(ticket.ticket_status, ticket.payment_status)
    ) {
      items.push({
        id: `ticket-res-${ticket.id}`,
        type: "reservation",
        eventId: ticket.event_id,
        eventName: eventName(ticket.event_id),
        label: "Nueva reserva de entrada",
        amount: Number(ticket.price_paid) || 0,
        status: "pendiente",
        href: ROUTES.adminEventoVentas(ticket.event_id),
        createdAt: ticket.created_at,
      });
    } else if (ticket.ticket_status === "used" && ticket.used_at) {
      items.push({
        id: `ticket-used-${ticket.id}`,
        type: "ticket_used",
        eventId: ticket.event_id,
        eventName: eventName(ticket.event_id),
        label: "Entrada utilizada en puerta",
        amount: null,
        status: "usada",
        href: ROUTES.adminEventoVentas(ticket.event_id),
        createdAt: ticket.used_at,
      });
    } else if (isCancelledOrExpiredTicket(ticket.ticket_status, ticket.payment_status)) {
      items.push({
        id: `ticket-cancel-${ticket.id}`,
        type: "ticket_cancelled",
        eventId: ticket.event_id,
        eventName: eventName(ticket.event_id),
        label: "Entrada cancelada o vencida",
        amount: null,
        status: ticket.ticket_status,
        href: ROUTES.adminEventoVentas(ticket.event_id),
        createdAt: ticket.cancelled_at || ticket.updated_at,
      });
    }
  }

  for (const order of kioskOrders) {
    if (!isTimestampInRange(order.created_at, range)) {
      continue;
    }

    const base = {
      eventId: order.event_id,
      eventName: eventName(order.event_id),
      amount: Number(order.total_amount) || 0,
      href: ROUTES.adminEventoKiosco(order.event_id),
    };

    if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID) {
      items.push({
        id: `kiosk-paid-${order.id}`,
        type: "kiosk_confirmed",
        ...base,
        label: "Orden de consumiciones confirmada",
        status: "pagada",
        createdAt: order.paid_at || order.created_at,
      });
    } else if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PENDING) {
      items.push({
        id: `kiosk-pending-${order.id}`,
        type: "kiosk_order",
        ...base,
        label: "Nueva orden de consumiciones",
        status: "pendiente",
        createdAt: order.created_at,
      });
    }
  }

  for (const event of events) {
    if (!isTimestampInRange(event.created_at, range)) {
      continue;
    }

    items.push({
      id: `event-created-${event.id}`,
      type: "event_created",
      eventId: event.id,
      eventName: event.name,
      label: "Evento creado",
      amount: null,
      status: event.status,
      href: ROUTES.adminEvento(event.id),
      createdAt: event.created_at,
    });

    if (
      event.status === EVENT_STATUS.PUBLISHED &&
      isTimestampInRange(event.updated_at, range) &&
      event.updated_at !== event.created_at
    ) {
      items.push({
        id: `event-published-${event.id}`,
        type: "event_published",
        eventId: event.id,
        eventName: event.name,
        label: "Evento publicado",
        amount: null,
        status: "publicado",
        href: ROUTES.adminEvento(event.id),
        createdAt: event.updated_at,
      });
    }
  }

  for (const type of ticketTypes) {
    if (type.stock_total === null || !type.is_active) {
      continue;
    }
    if (type.stock_sold >= type.stock_total) {
      items.push({
        id: `soldout-${type.event_id}-${type.name}`,
        type: "ticket_sold_out",
        eventId: type.event_id,
        eventName: eventName(type.event_id),
        label: `Entrada agotada: ${type.name}`,
        amount: null,
        status: "agotada",
        href: ROUTES.adminEventoEntradas(type.event_id),
        createdAt: new Date().toISOString(),
      });
    }
  }

  return items
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 20);
}

function buildAlerts(
  events: Event[],
  tickets: TicketRow[],
  ticketTypes: TicketTypeRow[],
  kioskProducts: KioskProductRow[],
  now: Date,
): AlertItem[] {
  const alerts: AlertItem[] = [];
  const typesByEvent = new Map<string, TicketTypeRow[]>();

  for (const type of ticketTypes) {
    const list = typesByEvent.get(type.event_id) ?? [];
    list.push(type);
    typesByEvent.set(type.event_id, list);
  }

  const alertCutoff = now.getTime() + RESERVATION_ALERT_HOURS * 60 * 60 * 1000;

  for (const ticket of tickets) {
    if (!isPendingReservation(ticket.ticket_status, ticket.payment_status)) {
      continue;
    }
    if (!ticket.reservation_expires_at) {
      continue;
    }
    const expires = new Date(ticket.reservation_expires_at).getTime();
    if (expires <= alertCutoff) {
      const event = events.find((e) => e.id === ticket.event_id);
      alerts.push({
        id: `res-exp-${ticket.id}`,
        severity: "high",
        title: "Reserva próxima a vencer",
        description: `${event?.name ?? "Evento"} tiene reservas que vencen pronto.`,
        href: ROUTES.adminEventoVentas(ticket.event_id),
      });
      break;
    }
  }

  for (const event of events) {
    const timing = getEventTiming(
      event.event_date,
      event.start_time,
      event.end_time,
      now,
    );

    if (
      event.status === EVENT_STATUS.PUBLISHED &&
      timing.isFinished
    ) {
      alerts.push({
        id: `past-published-${event.id}`,
        severity: "medium",
        title: "Evento pasado aún publicado",
        description: `${event.name} ya finalizó pero sigue como publicado.`,
        href: ROUTES.adminEvento(event.id),
      });
    }

    if (
      event.status === EVENT_STATUS.PUBLISHED &&
      !event.main_image_url &&
      !event.thumbnail_url
    ) {
      alerts.push({
        id: `no-image-${event.id}`,
        severity: "low",
        title: "Evento sin imagen",
        description: `${event.name} está publicado sin imagen principal.`,
        href: ROUTES.adminEvento(event.id),
      });
    }

    if (
      event.status === EVENT_STATUS.PUBLISHED &&
      !event.location_name &&
      !event.address
    ) {
      alerts.push({
        id: `no-location-${event.id}`,
        severity: "medium",
        title: "Evento sin lugar",
        description: `${event.name} no tiene lugar ni dirección configurados.`,
        href: ROUTES.adminEvento(event.id),
      });
    }

    const types = typesByEvent.get(event.id) ?? [];
    const activeTypes = types.filter((t) => t.is_active);

    if (
      (event.status === EVENT_STATUS.PUBLISHED ||
        event.status === EVENT_STATUS.SOLD_OUT) &&
      timing.isUpcoming &&
      activeTypes.length === 0
    ) {
      alerts.push({
        id: `no-tickets-${event.id}`,
        severity: "high",
        title: "Sin entradas configuradas",
        description: `${event.name} no tiene tipos de entrada activos.`,
        href: ROUTES.adminEventoEntradas(event.id),
      });
    }

    for (const type of activeTypes) {
      if (type.stock_total !== null && type.stock_sold >= type.stock_total) {
        alerts.push({
          id: `soldout-alert-${type.event_id}-${type.name}`,
          severity: "medium",
          title: "Entrada agotada",
          description: `${type.name} en ${event.name} está agotada.`,
          href: ROUTES.adminEventoEntradas(event.id),
        });
      }
    }
  }

  for (const product of kioskProducts) {
    if (!product.is_available || product.stock_total === null) {
      continue;
    }
    const remaining = product.stock_total - product.stock_sold;
    if (remaining >= 0 && remaining <= LOW_STOCK_THRESHOLD) {
      const event = events.find((e) => e.id === product.event_id);
      alerts.push({
        id: `low-stock-${product.event_id}-${remaining}`,
        severity: "medium",
        title: "Stock bajo de consumiciones",
        description: `${event?.name ?? "Evento"} tiene productos con stock bajo (${remaining} restantes).`,
        href: ROUTES.adminEventoKiosco(product.event_id),
      });
    }
  }

  const seen = new Set<string>();
  return alerts.filter((alert) => {
    if (seen.has(alert.id)) {
      return false;
    }
    seen.add(alert.id);
    return true;
  });
}

async function fetchAnalyticsRows(
  supabase: Awaited<ReturnType<typeof requireAdminPage>>["supabase"],
  range: ReturnType<typeof getDateRangeForPeriod>,
): Promise<AnalyticsRow[]> {
  let query = supabase
    .from("analytics_events")
    .select(
      "id, event_name, page_path, event_id, ticket_type_id, session_id, visitor_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (range.from) {
    query = query.gte("created_at", range.from.toISOString());
  }

  const { data, error } = await query.lte("created_at", range.to.toISOString());

  if (error) {
    if (error.code === "42P01" || error.message.includes("analytics_events")) {
      return [];
    }
    console.error("fetchAnalyticsRows:", error);
    return [];
  }

  return (data ?? []) as AnalyticsRow[];
}

export async function getAdminDashboardData(
  filters: DashboardFilters,
): Promise<AdminDashboardData> {
  const { supabase } = await requireAdminPage();
  const now = new Date();
  const range = getDateRangeForPeriod(filters, now);
  const eventFilter = filters.eventId;

  const events = await getAllEventsForAdmin();
  const eventIds = events.map((e) => e.id);

  const [pendingSales, financialMap] = await Promise.all([
    getPendingSalesSummary(),
    getFinancialSummariesByEventIds(eventIds),
  ]);

  const [
    { data: ticketsRaw },
    { data: ticketTypesRaw },
    { data: kioskOrdersRaw },
    { data: kioskItemsRaw },
    { data: kioskProductsRaw },
    analytics,
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select(
        "id, event_id, ticket_type_id, ticket_status, payment_status, price_paid, sales_channel, created_at, updated_at, reservation_expires_at, used_at, cancelled_at",
      )
      .in("event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("ticket_types")
      .select("event_id, stock_total, stock_sold, is_active, name")
      .in("event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase
      .from("kiosk_orders")
      .select("id, event_id, payment_status, total_amount, source, created_at, paid_at")
      .in("event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.from("kiosk_order_items").select("order_id, quantity"),
    supabase
      .from("event_kiosk_products")
      .select("event_id, stock_total, stock_sold, is_available")
      .in("event_id", eventIds.length > 0 ? eventIds : ["00000000-0000-0000-0000-000000000000"]),
    fetchAnalyticsRows(supabase, {
      from: range.from
        ? new Date(range.from.getTime() - 90 * 86_400_000)
        : null,
      to: range.to,
    }),
  ]);

  const tickets = (ticketsRaw ?? []) as TicketRow[];
  const ticketTypes = (ticketTypesRaw ?? []) as TicketTypeRow[];
  const kioskOrders = (kioskOrdersRaw ?? []) as KioskOrderRow[];
  const kioskItems = (kioskItemsRaw ?? []) as KioskItemRow[];
  const kioskProducts = (kioskProductsRaw ?? []) as KioskProductRow[];

  const upcomingEvents = events
    .filter((event) => {
      const timing = getEventTiming(
        event.event_date,
        event.start_time,
        event.end_time,
        now,
      );
      return !timing.isFinished;
    })
    .sort(compareEventsBySchedule)
    .map((event) =>
      buildEventRow(
        event,
        tickets,
        ticketTypes,
        kioskOrders,
        analytics,
        financialMap.get(event.id) ?? emptyFinancial(),
        now,
      ),
    );

  const recentEvents = events
    .filter((event) => {
      const timing = getEventTiming(
        event.event_date,
        event.start_time,
        event.end_time,
        now,
      );
      return timing.isFinished;
    })
    .sort((a, b) => b.event_date.localeCompare(a.event_date))
    .slice(0, 6)
    .map((event) =>
      buildEventRow(
        event,
        tickets,
        ticketTypes,
        kioskOrders,
        analytics,
        financialMap.get(event.id) ?? emptyFinancial(),
        now,
      ),
    );

  const nextEventRow = upcomingEvents[0] ?? null;

  const rangeMonth = getDateRangeForPeriod(
    { period: "month", eventId: null, customFrom: null, customTo: null },
    now,
  );
  const range7d = getDateRangeForPeriod(
    { period: "7d", eventId: null, customFrom: null, customTo: null },
    now,
  );

  return {
    filters,
    rangeLabel: getPeriodLabel(filters),
    nextEvent: nextEventRow
      ? { event: nextEventRow.event, timing: nextEventRow.timing }
      : null,
    revenue: buildRevenue(tickets, kioskOrders, eventFilter, range),
    revenueMonth: sumRevenueForRange(
      tickets,
      kioskOrders,
      eventFilter,
      rangeMonth,
    ),
    revenue7d: sumRevenueForRange(tickets, kioskOrders, eventFilter, range7d),
    tickets: buildTicketSummary(tickets, ticketTypes, eventFilter, range),
    kiosk: buildKioskSummary(
      kioskOrders,
      kioskItems,
      kioskProducts,
      eventFilter,
      range,
    ),
    traffic: buildTrafficSummary(analytics, events, range, now),
    upcomingEvents,
    recentEvents,
    revenueSeries: buildRevenueSeries(
      tickets,
      kioskOrders,
      eventFilter,
      range,
    ),
    trafficSeries: buildTrafficSeries(analytics, range),
    topEventsByViews: buildTopEventsByViews(analytics, events, tickets),
    recentActivity: buildActivity(
      tickets,
      kioskOrders,
      events,
      ticketTypes,
      range,
    ),
    alerts: buildAlerts(events, tickets, ticketTypes, kioskProducts, now),
    events: events.map((e) => ({ id: e.id, name: e.name })),
    pendingSales,
    globalFinancial: aggregateGlobalFinancial(financialMap),
  };
}
