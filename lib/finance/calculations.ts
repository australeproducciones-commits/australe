import type {
  EventExpense,
  EventFinancialSummary,
  EventOtherIncome,
} from "@/lib/finance/types";
import {
  EXPENSE_STATUS,
  OTHER_INCOME_STATUS,
} from "@/lib/finance/types";
import { isConfirmedSale, isPendingReservation } from "@/lib/ticket-sales/saleStatus";
import { SALES_CHANNEL } from "@/lib/ticket-sales/types";
import { KIOSK_ORDER_PAYMENT_STATUS } from "@/lib/kiosk/types";
import { formatTicketPrice } from "@/lib/tickets/utils";

type TicketRow = {
  ticket_status: string;
  payment_status: string;
  price_paid: number;
  sales_channel: string;
};

type KioskRow = {
  payment_status: string;
  total_amount: number;
};

type BuildFinancialInput = {
  tickets: TicketRow[];
  kioskOrders: KioskRow[];
  expenses: EventExpense[];
  otherIncome: EventOtherIncome[];
  pendingSalesCount: number;
};

export function buildEventFinancialSummary(
  input: BuildFinancialInput,
): EventFinancialSummary {
  let revenueTickets = 0;
  let revenueManual = 0;
  let revenuePending = 0;

  for (const ticket of input.tickets) {
    if (isConfirmedSale(ticket.ticket_status, ticket.payment_status)) {
      const amount = Number(ticket.price_paid) || 0;
      revenueTickets += amount;
      if (
        ticket.sales_channel === SALES_CHANNEL.ADMIN_MANUAL ||
        ticket.sales_channel === SALES_CHANNEL.DOOR
      ) {
        revenueManual += amount;
      }
    } else if (
      isPendingReservation(ticket.ticket_status, ticket.payment_status)
    ) {
      revenuePending += Number(ticket.price_paid) || 0;
    }
  }

  let revenueKiosk = 0;
  for (const order of input.kioskOrders) {
    if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID) {
      revenueKiosk += Number(order.total_amount) || 0;
    } else if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PENDING) {
      revenuePending += Number(order.total_amount) || 0;
    }
  }

  let revenueOtherCollected = 0;
  let otherPending = 0;
  for (const income of input.otherIncome) {
    if (income.status === OTHER_INCOME_STATUS.COLLECTED) {
      revenueOtherCollected += Number(income.amount) || 0;
    } else if (
      income.status === OTHER_INCOME_STATUS.PENDING ||
      income.status === OTHER_INCOME_STATUS.EXPECTED
    ) {
      otherPending += Number(income.amount) || 0;
    }
  }

  const revenueConfirmed =
    revenueTickets + revenueKiosk + revenueOtherCollected;

  let expensesPaid = 0;
  let expensesCommitted = 0;
  let expensesEstimated = 0;

  for (const expense of input.expenses) {
    if (expense.status === EXPENSE_STATUS.CANCELLED) {
      continue;
    }

    const amount = Number(expense.amount) || 0;
    const paid = Number(expense.amount_paid) || 0;

    expensesPaid += paid;

    if (expense.status === EXPENSE_STATUS.PAID) {
      continue;
    }

    const remaining = Math.max(0, amount - paid);
    expensesCommitted += remaining;

    if (expense.status === EXPENSE_STATUS.ESTIMATED) {
      expensesEstimated += amount;
    }
  }

  const realProfit = revenueConfirmed - expensesPaid;
  const projectedProfit =
    revenueConfirmed +
    revenuePending +
    otherPending -
    expensesPaid -
    expensesCommitted;

  const profitMarginPercent =
    revenueConfirmed > 0
      ? Math.round((realProfit / revenueConfirmed) * 1000) / 10
      : null;

  const profitVisualState = getProfitVisualState(
    realProfit,
    revenueConfirmed,
    expensesPaid,
    input.expenses.length,
  );

  return {
    revenueTickets,
    revenueKiosk,
    revenueManual,
    revenueOtherCollected,
    revenueConfirmed,
    revenuePending: revenuePending + otherPending,
    expensesPaid,
    expensesCommitted,
    expensesEstimated,
    realProfit,
    projectedProfit,
    profitMarginPercent,
    profitVisualState,
    profitBadgeLabel: getProfitBadgeLabel(realProfit, profitVisualState),
    pendingSalesCount: input.pendingSalesCount,
  };
}

function getProfitVisualState(
  realProfit: number,
  revenueConfirmed: number,
  expensesPaid: number,
  expenseCount: number,
): EventFinancialSummary["profitVisualState"] {
  if (revenueConfirmed === 0 && expensesPaid === 0 && expenseCount === 0) {
    return "incomplete";
  }

  if (realProfit > 0) {
    return "positive";
  }

  if (realProfit < 0) {
    return "negative";
  }

  return "neutral";
}

function getProfitBadgeLabel(
  realProfit: number,
  state: EventFinancialSummary["profitVisualState"],
): string {
  if (state === "incomplete") {
    return "Datos incompletos";
  }

  if (state === "neutral") {
    return "Equilibrado";
  }

  if (state === "negative") {
    return `Pérdida ${formatTicketPrice(Math.abs(realProfit))}`;
  }

  return `Ganancia ${formatTicketPrice(realProfit)}`;
}

export function formatProfitMargin(
  margin: number | null,
): string {
  if (margin == null) {
    return "Sin datos suficientes";
  }

  return `${margin.toLocaleString("es-AR")} %`;
}
