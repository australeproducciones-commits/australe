"use client";

import { useActionState } from "react";
import { SimpleBarChart } from "@/components/admin/dashboard/SimpleBarChart";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  cancelEventExpenseFormAction,
  closeEventFinancialManagementFormAction,
  reopenEventFinancialManagementFormAction,
  upsertEventExpenseFormAction,
  upsertEventOtherIncomeFormAction,
} from "@/lib/finance/actions";
import type { EventManagementData } from "@/lib/finance/queries";
import {
  EXPENSE_STATUS,
  EXPENSE_STATUS_LABELS,
  OTHER_INCOME_STATUS,
  OTHER_INCOME_STATUS_LABELS,
} from "@/lib/finance/types";
import { formatProfitMargin } from "@/lib/finance/calculations";
import { FINANCIAL_MANAGEMENT_STATUS } from "@/lib/constants/event-audience";
import { ROUTES } from "@/lib/constants/routes";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { adminInputClassName } from "@/lib/utils/adminFormStyles";

type EventManagementViewProps = {
  data: EventManagementData;
};

const actionInitial = { success: false as boolean, error: undefined as string | undefined };

export function EventManagementView({ data }: EventManagementViewProps) {
  const { event, summary, expenses, otherIncome, categories } = data;
  const isClosed =
    event.financial_management_status === FINANCIAL_MANAGEMENT_STATUS.CLOSED;

  const expenseAction = upsertEventExpenseFormAction.bind(null, event.id);
  const incomeAction = upsertEventOtherIncomeFormAction.bind(null, event.id);
  const [expenseState, expenseFormAction, expensePending] = useActionState(
    expenseAction,
    actionInitial,
  );
  const [incomeState, incomeFormAction, incomePending] = useActionState(
    incomeAction,
    actionInitial,
  );

  const expenseChartLabels = expenses
    .filter((e) => e.status !== EXPENSE_STATUS.CANCELLED)
    .slice(0, 8)
    .map((e) => e.concept.slice(0, 12));

  const expenseChartValues = expenses
    .filter((e) => e.status !== EXPENSE_STATUS.CANCELLED)
    .slice(0, 8)
    .map((e) => Number(e.amount_paid) || 0);

  return (
    <div className="space-y-8">
      {isClosed ? (
        <Card padding="md" className="border-amber-400/30 bg-amber-400/10">
          <p className="text-sm text-amber-100">
            Gestión cerrada
            {event.financial_closed_at
              ? ` el ${new Date(event.financial_closed_at).toLocaleString("es-AR")}`
              : ""}
            . Los gastos e ingresos no se pueden modificar sin reabrir.
          </p>
          <form action={reopenEventFinancialManagementFormAction.bind(null, event.id)} className="mt-3">
            <Button type="submit" variant="outline" size="sm">
              Reabrir gestión
            </Button>
          </form>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FinanceCard label="Ingresos confirmados" value={formatTicketPrice(summary.revenueConfirmed)} />
        <FinanceCard label="Ingresos pendientes" value={formatTicketPrice(summary.revenuePending)} />
        <FinanceCard label="Gastos pagados" value={formatTicketPrice(summary.expensesPaid)} />
        <FinanceCard label="Gastos pendientes" value={formatTicketPrice(summary.expensesCommitted)} />
        <FinanceCard
          label="Ganancia real"
          value={formatTicketPrice(summary.realProfit)}
          highlight={summary.profitVisualState}
        />
        <FinanceCard
          label="Ganancia proyectada"
          value={formatTicketPrice(summary.projectedProfit)}
          hint="Incluye pendientes; no es dinero confirmado"
        />
      </section>

      <Card padding="md">
        <h2 className="text-lg font-bold text-white">Resultado</h2>
        <dl className="mt-4 space-y-2 font-mono text-sm text-zinc-300">
          <ResultRow label="Ingresos confirmados" value={formatTicketPrice(summary.revenueConfirmed)} />
          <ResultRow label="Gastos pagados" value={formatTicketPrice(summary.expensesPaid)} />
          <ResultRow label="Ganancia real" value={formatTicketPrice(summary.realProfit)} strong />
          <ResultRow label="Ingresos pendientes" value={formatTicketPrice(summary.revenuePending)} />
          <ResultRow label="Gastos pendientes" value={formatTicketPrice(summary.expensesCommitted)} />
          <ResultRow label="Ganancia proyectada" value={formatTicketPrice(summary.projectedProfit)} strong />
          <ResultRow label="Margen" value={formatProfitMargin(summary.profitMarginPercent)} />
        </dl>
        {!isClosed ? (
          <form action={closeEventFinancialManagementFormAction.bind(null, event.id)} className="mt-6">
            <Button type="submit" variant="outline" size="sm">
              Cerrar gestión económica
            </Button>
          </form>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h2 className="text-lg font-bold text-white">Ingresos por origen</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>Entradas: {formatTicketPrice(summary.revenueTickets)}</li>
            <li>Consumiciones: {formatTicketPrice(summary.revenueKiosk)}</li>
            <li>Ventas manuales: {formatTicketPrice(summary.revenueManual)}</li>
            <li>Otros ingresos: {formatTicketPrice(summary.revenueOtherCollected)}</li>
          </ul>
        </Card>

        <Card padding="md">
          <h2 className="text-lg font-bold text-white">Gastos por concepto (pagado)</h2>
          <div className="mt-4">
            <SimpleBarChart
              labels={expenseChartLabels}
              series={[
                {
                  key: "paid",
                  label: "Pagado",
                  color: "#9b7ede",
                  values: expenseChartValues,
                },
              ]}
              emptyMessage="Sin gastos registrados."
            />
          </div>
        </Card>
      </div>

      <Card padding="md">
        <h2 className="text-lg font-bold text-white">Gastos</h2>
        {expenses.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Todavía no hay gastos cargados.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {expenses.map((expense) => (
              <li
                key={expense.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white">{expense.concept}</p>
                    <p className="text-zinc-400">
                      {expense.category_name ?? "Sin categoría"}
                      {expense.provider ? ` · ${expense.provider}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white">
                      {formatTicketPrice(Number(expense.amount))}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Pagado: {formatTicketPrice(Number(expense.amount_paid))}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  {EXPENSE_STATUS_LABELS[expense.status]}
                </p>
                {!isClosed ? (
                  <form
                    action={cancelEventExpenseFormAction.bind(null, event.id, expense.id)}
                    className="mt-2"
                  >
                    <Button type="submit" variant="ghost" size="sm">
                      Cancelar gasto
                    </Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {!isClosed ? (
          <form action={expenseFormAction} className="mt-6 grid gap-3 sm:grid-cols-2">
            <input name="concept" placeholder="Concepto" required className={adminInputClassName} />
            <select name="category_id" className={adminInputClassName} defaultValue="">
              <option value="">Categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="provider" placeholder="Proveedor" className={adminInputClassName} />
            <input name="amount" type="number" min={0} step="0.01" placeholder="Importe" required className={adminInputClassName} />
            <input name="amount_paid" type="number" min={0} step="0.01" placeholder="Pagado" className={adminInputClassName} />
            <input name="expense_date" type="date" className={adminInputClassName} />
            <select name="status" className={adminInputClassName} defaultValue={EXPENSE_STATUS.ESTIMATED}>
              {Object.entries(EXPENSE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <textarea name="description" placeholder="Descripción" className={adminInputClassName} />
            {expenseState.error ? (
              <p className="text-sm text-red-300 sm:col-span-2">{expenseState.error}</p>
            ) : null}
            <Button type="submit" disabled={expensePending} className="sm:col-span-2">
              Agregar gasto
            </Button>
          </form>
        ) : null}
      </Card>

      <Card padding="md">
        <h2 className="text-lg font-bold text-white">Otros ingresos</h2>
        {otherIncome.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Sin otros ingresos registrados.</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {otherIncome.map((income) => (
              <li key={income.id} className="flex justify-between rounded-lg bg-white/5 px-3 py-2">
                <span className="text-zinc-200">{income.concept}</span>
                <span className="font-semibold text-white">
                  {formatTicketPrice(Number(income.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!isClosed ? (
          <form action={incomeFormAction} className="mt-6 grid gap-3 sm:grid-cols-2">
            <input name="concept" placeholder="Concepto" required className={adminInputClassName} />
            <input name="amount" type="number" min={0} step="0.01" placeholder="Importe" required className={adminInputClassName} />
            <input name="category" placeholder="Categoría" className={adminInputClassName} />
            <input name="income_date" type="date" className={adminInputClassName} />
            <select name="status" className={adminInputClassName} defaultValue={OTHER_INCOME_STATUS.EXPECTED}>
              {Object.entries(OTHER_INCOME_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {incomeState.error ? (
              <p className="text-sm text-red-300 sm:col-span-2">{incomeState.error}</p>
            ) : null}
            <Button type="submit" disabled={incomePending} className="sm:col-span-2">
              Agregar ingreso
            </Button>
          </form>
        ) : null}
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button href={ROUTES.adminEventoVentas(event.id)} variant="outline" size="sm">
          Ver ventas
        </Button>
        <Button href={ROUTES.adminEvento(event.id)} variant="ghost" size="sm">
          Volver al evento
        </Button>
      </div>
    </div>
  );
}

function FinanceCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: "positive" | "neutral" | "negative" | "incomplete";
}) {
  const tone =
    highlight === "positive"
      ? "border-emerald-400/30"
      : highlight === "negative"
        ? "border-red-400/30"
        : "border-white/10";

  return (
    <div className={`rounded-2xl border bg-white/5 p-5 ${tone}`}>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
      <dt className={strong ? "font-semibold text-white" : ""}>{label}</dt>
      <dd className={strong ? "font-bold text-white" : ""}>{value}</dd>
    </div>
  );
}
