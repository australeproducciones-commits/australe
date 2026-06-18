"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { ROUTES } from "@/lib/constants/routes";
import { FINANCIAL_MANAGEMENT_STATUS } from "@/lib/constants/event-audience";
import { requireAdminPage } from "@/lib/events/queries";
import type { ExpenseStatus, OtherIncomeStatus } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type ActionResult = { success: boolean; error?: string };

export async function upsertEventExpenseFormAction(
  eventId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return upsertEventExpenseAction(eventId, formData);
}

export async function upsertEventOtherIncomeFormAction(
  eventId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  return upsertEventOtherIncomeAction(eventId, formData);
}

function revalidateEventFinancialPaths(eventId: string) {
  revalidatePath(ROUTES.adminEventoGestion(eventId));
  revalidatePath(ROUTES.adminEvento(eventId));
  revalidatePath(ROUTES.adminEventos);
  revalidatePath(ROUTES.admin);
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const parsed = Number(text);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

async function assertManagementOpen(eventId: string): Promise<ActionResult | null> {
  const { supabase } = await requireAdminPage();
  const { data } = await supabase
    .from("events")
    .select("financial_management_status")
    .eq("id", eventId)
    .maybeSingle();

  if (data?.financial_management_status === FINANCIAL_MANAGEMENT_STATUS.CLOSED) {
    return {
      success: false,
      error: "La gestión económica de este evento está cerrada.",
    };
  }

  return null;
}

export async function closeEventFinancialManagementFormAction(
  eventId: string,
): Promise<void> {
  await closeEventFinancialManagementAction(eventId);
}

export async function reopenEventFinancialManagementFormAction(
  eventId: string,
): Promise<void> {
  await reopenEventFinancialManagementAction(eventId);
}

export async function upsertEventExpenseAction(
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  const closed = await assertManagementOpen(eventId);
  if (closed) {
    return closed;
  }

  const { supabase, profile } = await requireAdminPage();
  const expenseId = String(formData.get("expense_id") ?? "").trim();
  const concept = String(formData.get("concept") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));

  if (!concept) {
    return { success: false, error: "El concepto es obligatorio." };
  }
  if (amount == null) {
    return { success: false, error: "El importe debe ser mayor o igual a 0." };
  }

  const quantity = parseAmount(formData.get("quantity")) ?? 1;
  const unitPriceFromForm = parseAmount(formData.get("unit_price"));

  const payload = {
    event_id: eventId,
    category_id: String(formData.get("category_id") ?? "").trim() || null,
    concept,
    description: String(formData.get("description") ?? "").trim() || null,
    provider: String(formData.get("provider") ?? "").trim() || null,
    amount,
    quantity,
    unit_price:
      unitPriceFromForm ??
      (quantity > 1 ? Math.round(amount / quantity) : amount),
    expense_date: String(formData.get("expense_date") ?? "").trim() || null,
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    status: String(formData.get("status") ?? "estimated") as ExpenseStatus,
    payment_method: String(formData.get("payment_method") ?? "").trim() || null,
    receipt_number: String(formData.get("receipt_number") ?? "").trim() || null,
    internal_note: String(formData.get("internal_note") ?? "").trim() || null,
    amount_paid: parseAmount(formData.get("amount_paid")) ?? 0,
    updated_by: profile.id,
  };

  if (payload.amount_paid > payload.amount) {
    return {
      success: false,
      error: "El monto pagado no puede superar el importe total.",
    };
  }

  if (expenseId) {
    const { error } = await supabase
      .from("event_expenses")
      .update(payload)
      .eq("id", expenseId)
      .eq("event_id", eventId);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("event_expenses").insert({
      ...payload,
      created_by: profile.id,
    });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidateEventFinancialPaths(eventId);
  return { success: true };
}

export async function cancelEventExpenseAction(
  eventId: string,
  expenseId: string,
): Promise<ActionResult> {
  const closed = await assertManagementOpen(eventId);
  if (closed) {
    return closed;
  }

  const { supabase, profile } = await requireAdminPage();
  const { error } = await supabase
    .from("event_expenses")
    .update({ status: "cancelled", updated_by: profile.id })
    .eq("id", expenseId)
    .eq("event_id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateEventFinancialPaths(eventId);
  return { success: true };
}

export async function cancelEventExpenseFormAction(
  eventId: string,
  expenseId: string,
): Promise<void> {
  await cancelEventExpenseAction(eventId, expenseId);
}

export async function upsertEventOtherIncomeAction(
  eventId: string,
  formData: FormData,
): Promise<ActionResult> {
  const closed = await assertManagementOpen(eventId);
  if (closed) {
    return closed;
  }

  const { supabase, profile } = await requireAdminPage();
  const incomeId = String(formData.get("income_id") ?? "").trim();
  const concept = String(formData.get("concept") ?? "").trim();
  const amount = parseAmount(formData.get("amount"));

  if (!concept) {
    return { success: false, error: "El concepto es obligatorio." };
  }
  if (amount == null) {
    return { success: false, error: "El importe debe ser mayor o igual a 0." };
  }

  const payload = {
    event_id: eventId,
    concept,
    category: String(formData.get("category") ?? "").trim() || null,
    amount,
    income_date: String(formData.get("income_date") ?? "").trim() || null,
    status: String(formData.get("status") ?? "expected") as OtherIncomeStatus,
    note: String(formData.get("note") ?? "").trim() || null,
    updated_by: profile.id,
  };

  if (incomeId) {
    const { error } = await supabase
      .from("event_other_income")
      .update(payload)
      .eq("id", incomeId)
      .eq("event_id", eventId);

    if (error) {
      return { success: false, error: error.message };
    }
  } else {
    const { error } = await supabase.from("event_other_income").insert({
      ...payload,
      created_by: profile.id,
    });

    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidateEventFinancialPaths(eventId);
  return { success: true };
}

export async function closeEventFinancialManagementAction(
  eventId: string,
): Promise<ActionResult> {
  const { supabase, profile } = await requireAdminPage();

  const { error } = await supabase
    .from("events")
    .update({
      financial_management_status: FINANCIAL_MANAGEMENT_STATUS.CLOSED,
      financial_closed_at: new Date().toISOString(),
      financial_closed_by: profile.id,
    })
    .eq("id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateEventFinancialPaths(eventId);
  return { success: true };
}

export async function reopenEventFinancialManagementAction(
  eventId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || profile.role !== "admin") {
    return { success: false, error: "No autorizado." };
  }

  const { error } = await supabase
    .from("events")
    .update({
      financial_management_status: FINANCIAL_MANAGEMENT_STATUS.OPEN,
      financial_closed_at: null,
      financial_closed_by: null,
    })
    .eq("id", eventId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateEventFinancialPaths(eventId);
  return { success: true };
}
