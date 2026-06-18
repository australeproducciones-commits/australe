export const EXPENSE_STATUS = {
  ESTIMATED: "estimated",
  PENDING: "pending",
  PARTIAL: "partial",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type ExpenseStatus =
  (typeof EXPENSE_STATUS)[keyof typeof EXPENSE_STATUS];

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  [EXPENSE_STATUS.ESTIMATED]: "Estimado",
  [EXPENSE_STATUS.PENDING]: "Pendiente",
  [EXPENSE_STATUS.PARTIAL]: "Parcialmente pagado",
  [EXPENSE_STATUS.PAID]: "Pagado",
  [EXPENSE_STATUS.CANCELLED]: "Cancelado",
};

export const OTHER_INCOME_STATUS = {
  EXPECTED: "expected",
  PENDING: "pending",
  COLLECTED: "collected",
  CANCELLED: "cancelled",
} as const;

export type OtherIncomeStatus =
  (typeof OTHER_INCOME_STATUS)[keyof typeof OTHER_INCOME_STATUS];

export const OTHER_INCOME_STATUS_LABELS: Record<OtherIncomeStatus, string> = {
  [OTHER_INCOME_STATUS.EXPECTED]: "Previsto",
  [OTHER_INCOME_STATUS.PENDING]: "Pendiente",
  [OTHER_INCOME_STATUS.COLLECTED]: "Cobrado",
  [OTHER_INCOME_STATUS.CANCELLED]: "Cancelado",
};

export type EventExpense = {
  id: string;
  event_id: string;
  category_id: string | null;
  concept: string;
  description: string | null;
  provider: string | null;
  amount: number;
  quantity: number;
  unit_price: number | null;
  expense_date: string | null;
  due_date: string | null;
  status: ExpenseStatus;
  payment_method: string | null;
  receipt_number: string | null;
  internal_note: string | null;
  amount_paid: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  category_name?: string | null;
};

export type EventOtherIncome = {
  id: string;
  event_id: string;
  concept: string;
  category: string | null;
  amount: number;
  income_date: string | null;
  status: OtherIncomeStatus;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventFinancialSummary = {
  revenueTickets: number;
  revenueKiosk: number;
  revenueManual: number;
  revenueOtherCollected: number;
  revenueConfirmed: number;
  revenuePending: number;
  expensesPaid: number;
  expensesCommitted: number;
  expensesEstimated: number;
  realProfit: number;
  projectedProfit: number;
  profitMarginPercent: number | null;
  profitVisualState: "positive" | "neutral" | "negative" | "incomplete";
  profitBadgeLabel: string;
  pendingSalesCount: number;
};
