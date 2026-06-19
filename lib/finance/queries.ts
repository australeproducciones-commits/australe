import { buildEventFinancialSummary } from "@/lib/finance/calculations";
import type {
  EventExpense,
  EventFinancialSummary,
  EventOtherIncome,
} from "@/lib/finance/types";
import { requireAdminPage } from "@/lib/events/queries";
import { throwSupabaseQueryError } from "@/lib/supabase/queryError";
import type { Event } from "@/lib/events/types";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import { getPendingSalesSummary } from "@/lib/ticket-sales/pendingSales";

export type EventManagementData = {
  event: Event;
  summary: EventFinancialSummary;
  expenses: EventExpense[];
  otherIncome: EventOtherIncome[];
  categories: Array<{ id: string; name: string }>;
};

export async function getEventExpenses(
  eventId: string,
): Promise<EventExpense[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("event_expenses")
    .select(
      "id, event_id, category_id, concept, description, provider, amount, quantity, unit_price, expense_date, due_date, status, payment_method, receipt_number, internal_note, amount_paid, created_by, updated_by, created_at, updated_at",
    )
    .eq("event_id", eventId)
    .neq("status", "cancelled")
    .order("expense_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throwSupabaseQueryError("getEventExpenses", error);
  }

  return (data ?? []) as EventExpense[];
}

export async function getEventOtherIncome(
  eventId: string,
): Promise<EventOtherIncome[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("event_other_income")
    .select(
      "id, event_id, concept, category, amount, income_date, status, note, created_by, updated_by, created_at, updated_at",
    )
    .eq("event_id", eventId)
    .neq("status", "cancelled")
    .order("income_date", { ascending: false, nullsFirst: false });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throwSupabaseQueryError("getEventOtherIncome", error);
  }

  return (data ?? []) as EventOtherIncome[];
}

export async function getExpenseCategories(): Promise<
  Array<{ id: string; name: string }>
> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("event_expense_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throwSupabaseQueryError("getExpenseCategories", error);
  }

  return (data ?? []) as Array<{ id: string; name: string }>;
}

export async function getEventManagementData(
  eventId: string,
): Promise<EventManagementData | null> {
  const event = await getEventByIdForAdmin(eventId);
  if (!event) {
    return null;
  }

  const { supabase } = await requireAdminPage();
  const pendingSummary = await getPendingSalesSummary();
  const pendingForEvent = pendingSummary.byEvent.get(eventId) ?? 0;

  const [
    { data: tickets },
    { data: kioskOrders },
    expenses,
    otherIncome,
    categories,
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("ticket_status, payment_status, price_paid, sales_channel")
      .eq("event_id", eventId),
    supabase
      .from("kiosk_orders")
      .select("payment_status, total_amount")
      .eq("event_id", eventId),
    getEventExpenses(eventId),
    getEventOtherIncome(eventId),
    getExpenseCategories(),
  ]);

  const summary = buildEventFinancialSummary({
    tickets: tickets ?? [],
    kioskOrders: kioskOrders ?? [],
    expenses,
    otherIncome,
    pendingSalesCount: pendingForEvent,
  });

  return { event, summary, expenses, otherIncome, categories };
}

export async function getFinancialSummariesByEventIds(
  eventIds: string[],
): Promise<Map<string, EventFinancialSummary>> {
  const result = new Map<string, EventFinancialSummary>();
  if (eventIds.length === 0) {
    return result;
  }

  const { supabase } = await requireAdminPage();
  const pendingSummary = await getPendingSalesSummary();

  const [
    { data: tickets },
    { data: kioskOrders },
    { data: expenses },
    { data: otherIncome },
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("event_id, ticket_status, payment_status, price_paid, sales_channel")
      .in("event_id", eventIds),
    supabase
      .from("kiosk_orders")
      .select("event_id, payment_status, total_amount")
      .in("event_id", eventIds),
    supabase
      .from("event_expenses")
      .select("event_id, amount, amount_paid, status")
      .in("event_id", eventIds)
      .neq("status", "cancelled"),
    supabase
      .from("event_other_income")
      .select("event_id, amount, status")
      .in("event_id", eventIds)
      .neq("status", "cancelled"),
  ]);

  for (const eventId of eventIds) {
    const eventTickets = (tickets ?? []).filter((t) => t.event_id === eventId);
    const eventKiosk = (kioskOrders ?? []).filter((o) => o.event_id === eventId);
    const eventExpenses = (expenses ?? []).filter((e) => e.event_id === eventId) as EventExpense[];
    const eventIncome = (otherIncome ?? []).filter((i) => i.event_id === eventId) as EventOtherIncome[];

    result.set(
      eventId,
      buildEventFinancialSummary({
        tickets: eventTickets,
        kioskOrders: eventKiosk,
        expenses: eventExpenses,
        otherIncome: eventIncome,
        pendingSalesCount: pendingSummary.byEvent.get(eventId) ?? 0,
      }),
    );
  }

  return result;
}
