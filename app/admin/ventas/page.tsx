import Link from "next/link";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { formatRelativeTime } from "@/lib/admin/dashboard/format";
import { getPendingSalesSummary } from "@/lib/ticket-sales/pendingSales";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { cn } from "@/lib/utils/cn";

const URGENCY_STYLES = {
  expired: "border-red-300/40 bg-red-500/10 text-red-200",
  expiring: "border-amber-300/40 bg-amber-500/10 text-amber-100",
  recent: "border-white/10 bg-white/5 text-zinc-200",
} as const;

export default async function AdminVentasPage() {
  const summary = await getPendingSalesSummary();

  return (
    <>
      <AdminHeader
        title="Ventas por confirmar"
        description="Reservas y órdenes pendientes de confirmación en todos los eventos."
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Operaciones" value={String(summary.totalOperations)} />
          <SummaryCard label="Entradas" value={String(summary.totalTickets)} />
          <SummaryCard
            label="Importe pendiente"
            value={formatTicketPrice(summary.totalAmount)}
          />
        </div>

        {summary.items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-lg font-semibold text-white">
              No hay ventas pendientes de confirmar
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Cuando haya reservas o pagos por revisar, aparecerán acá.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {summary.items.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={item.href}
                  className={cn(
                    "block rounded-2xl border p-4 transition hover:brightness-110",
                    URGENCY_STYLES[item.urgency],
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.eventName}</p>
                      <p className="mt-1 text-sm opacity-90">
                        {item.type === "ticket"
                          ? "Reserva de entrada"
                          : "Orden de consumiciones"}
                        {" · "}
                        {item.buyerLabel}
                      </p>
                      <p className="mt-1 text-xs opacity-75">
                        {formatRelativeTime(item.createdAt)}
                        {item.expiresAt
                          ? ` · Vence ${formatRelativeTime(item.expiresAt).replace("Hace", "el")}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatTicketPrice(item.amount)}</p>
                      {item.ticketCount > 0 ? (
                        <p className="text-xs opacity-75">
                          {item.ticketCount} entrada{item.ticketCount === 1 ? "" : "s"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
