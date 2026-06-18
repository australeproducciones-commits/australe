import type { Event } from "@/lib/events/types";
import type { EventTimingResult } from "@/lib/events/eventTiming";
import type { EventFinancialSummary } from "@/lib/finance/types";
import type { PendingSalesSummary } from "@/lib/ticket-sales/pendingSales";

export type DashboardPeriod =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export type DashboardFilters = {
  period: DashboardPeriod;
  eventId: string | null;
  customFrom: string | null;
  customTo: string | null;
};

export type DateRange = {
  from: Date | null;
  to: Date;
};

export type RevenueBreakdown = {
  tickets: number;
  kiosk: number;
  manual: number;
  total: number;
  pending: number;
};

export type TicketSummary = {
  soldConfirmed: number;
  stockTotal: number | null;
  hasUndefinedStock: boolean;
  soldPercent: number | null;
  pendingConfirmation: number;
  used: number;
  cancelled: number;
};

export type KioskSummary = {
  ordersConfirmed: number;
  productsSold: number;
  revenue: number;
  ordersPending: number;
  lowStockProducts: number;
};

export type TrafficSummary = {
  available: boolean;
  totalVisits: number;
  uniqueVisitors: number;
  visitsToday: number;
  visits7d: number;
  visits30d: number;
  visitsYesterday: number;
  visitsChangePercent: number | null;
  topPagePath: string | null;
  topEventId: string | null;
  topEventName: string | null;
  conversionFormula: string;
};

export type NextEventSummary = {
  event: Event;
  timing: EventTimingResult;
};

export type EventDashboardRow = {
  event: Event;
  timing: EventTimingResult;
  ticketsSold: number;
  stockTotal: number | null;
  hasUndefinedStock: boolean;
  occupancyPercent: number | null;
  revenue: number;
  kioskRevenue: number;
  pendingReservations: number;
  visits: number;
  uniqueVisitors: number;
  financial: EventFinancialSummary;
};

export type DailyRevenuePoint = {
  date: string;
  tickets: number;
  kiosk: number;
  manual: number;
  total: number;
};

export type DailyTrafficPoint = {
  date: string;
  visits: number;
  uniqueVisitors: number;
};

export type EventTrafficRow = {
  eventId: string;
  eventName: string;
  eventSlug: string;
  visits: number;
  uniqueVisitors: number;
  ticketClicks: number;
  confirmedPurchases: number;
  conversionPercent: number | null;
};

export type ActivityItem = {
  id: string;
  type:
    | "sale_confirmed"
    | "reservation"
    | "payment_confirmed"
    | "ticket_used"
    | "ticket_cancelled"
    | "kiosk_order"
    | "kiosk_confirmed"
    | "event_created"
    | "event_published"
    | "ticket_sold_out"
    | "product_low_stock";
  eventId: string | null;
  eventName: string | null;
  label: string;
  amount: number | null;
  status: string | null;
  href: string | null;
  createdAt: string;
};

export type AlertItem = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  href: string;
};

export type AdminDashboardData = {
  filters: DashboardFilters;
  rangeLabel: string;
  nextEvent: NextEventSummary | null;
  revenue: RevenueBreakdown;
  revenueMonth: number;
  revenue7d: number;
  tickets: TicketSummary;
  kiosk: KioskSummary;
  traffic: TrafficSummary;
  upcomingEvents: EventDashboardRow[];
  recentEvents: EventDashboardRow[];
  revenueSeries: DailyRevenuePoint[];
  trafficSeries: DailyTrafficPoint[];
  topEventsByViews: EventTrafficRow[];
  recentActivity: ActivityItem[];
  alerts: AlertItem[];
  events: Array<{ id: string; name: string }>;
  pendingSales: PendingSalesSummary;
  globalFinancial: {
    revenueConfirmed: number;
    revenuePending: number;
    expensesPaid: number;
    expensesCommitted: number;
    realProfit: number;
    projectedProfit: number;
  };
};
