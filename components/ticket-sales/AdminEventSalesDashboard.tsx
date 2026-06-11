import { Card } from "@/components/ui/Card";
import type { EventVentasDashboard } from "@/lib/ticket-sales/eventVentasStats";
import { VENTAS_STATUS_ORDER } from "@/lib/ticket-sales/eventVentasStats";
import { TICKET_STATUS_LABELS } from "@/lib/ticket-sales/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";

type AdminEventSalesDashboardProps = {
  dashboard: EventVentasDashboard;
};

export function AdminEventSalesDashboard({
  dashboard,
}: AdminEventSalesDashboardProps) {
  const stockLabel =
    dashboard.stockTotal != null
      ? `${dashboard.stockSold} / ${dashboard.stockTotal} en stock`
      : dashboard.hasUndefinedStock
        ? `${dashboard.stockSold} vendidas · stock ilimitado parcial`
        : `${dashboard.stockSold} en stock`;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Recaudación confirmada"
          value={formatTicketPrice(dashboard.revenueConfirmed)}
          tone="emerald"
        />
        <SummaryCard
          label="Entradas confirmadas"
          value={String(dashboard.confirmedCount)}
          hint={stockLabel}
          tone="purple"
        />
        <SummaryCard
          label="Reservas pendientes"
          value={String(dashboard.pendingReservationCount)}
          hint="Aguardan confirmación de pago"
          tone="amber"
        />
        <SummaryCard
          label="Tiempo al evento"
          value={dashboard.timeUntilEventLabel}
          hint={dashboard.eventDateLabel}
          tone={dashboard.isEventPast ? "neutral" : "sky"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Por estado
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            {dashboard.totalTickets} entrada
            {dashboard.totalTickets === 1 ? "" : "s"} en total
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {VENTAS_STATUS_ORDER.map((status) => {
              const count = dashboard.byStatus[status];
              if (count === 0) {
                return null;
              }

              return (
                <span
                  key={status}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-zinc-200"
                >
                  {TICKET_STATUS_LABELS[status]}:{" "}
                  <span className="font-semibold text-white">{count}</span>
                </span>
              );
            })}
            {dashboard.totalTickets === 0 ? (
              <span className="text-sm text-zinc-500">Sin entradas todavía</span>
            ) : null}
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
            Por tipo de entrada
          </h3>
          {dashboard.byType.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500">
              No hay tipos de entrada configurados.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {dashboard.byType.map((row) => (
                <li
                  key={row.typeId ?? row.typeName}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{row.typeName}</p>
                    <p className="text-xs text-zinc-500">
                      {row.confirmed} confirmada{row.confirmed === 1 ? "" : "s"} ·{" "}
                      {row.total} total
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-purple-200">
                    {formatTicketPrice(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "emerald" | "purple" | "amber" | "sky" | "neutral";
}) {
  const toneClass = {
    emerald: "border-emerald-400/20 bg-emerald-400/5",
    purple: "border-purple-400/20 bg-purple-400/5",
    amber: "border-amber-400/20 bg-amber-400/5",
    sky: "border-sky-400/20 bg-sky-400/5",
    neutral: "border-white/10 bg-white/[0.03]",
  }[tone];

  return (
    <Card padding="md" className={toneClass}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </Card>
  );
}
