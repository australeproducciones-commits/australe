import Link from "next/link";
import type { ActivityItem } from "@/lib/admin/dashboard/types";
import { formatRelativeTime } from "@/lib/admin/dashboard/format";
import { formatDashboardCurrency } from "@/lib/admin/dashboard/formatters";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const typeMeta: Record<
  ActivityItem["type"],
  { label: string; tone: string; dot: string }
> = {
  sale_confirmed: {
    label: "Venta confirmada",
    tone: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  reservation: {
    label: "Reserva pendiente",
    tone: "text-amber-200",
    dot: "bg-amber-400",
  },
  payment_confirmed: {
    label: "Pago confirmado",
    tone: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  ticket_used: {
    label: "Acceso registrado",
    tone: "text-sky-200",
    dot: "bg-sky-400",
  },
  ticket_cancelled: {
    label: "Cancelación",
    tone: "text-rose-200",
    dot: "bg-rose-400",
  },
  kiosk_order: {
    label: "Consumición pendiente",
    tone: "text-amber-200",
    dot: "bg-amber-400",
  },
  kiosk_confirmed: {
    label: "Consumición vendida",
    tone: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  event_created: {
    label: "Evento creado",
    tone: "text-zinc-200",
    dot: "bg-zinc-400",
  },
  event_published: {
    label: "Evento publicado",
    tone: "text-purple-200",
    dot: "bg-purple-400",
  },
  ticket_sold_out: {
    label: "Entrada agotada",
    tone: "text-rose-200",
    dot: "bg-rose-400",
  },
  product_low_stock: {
    label: "Stock bajo",
    tone: "text-amber-200",
    dot: "bg-amber-400",
  },
};

type RecentActivityPanelProps = {
  items: ActivityItem[];
};

export function RecentActivityPanel({ items }: RecentActivityPanelProps) {
  const visibleItems = items.slice(0, 8);

  if (visibleItems.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-zinc-950/40 px-4 py-8 text-center text-sm text-zinc-400">
        Sin actividad reciente en este período.
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-white/10">
        {visibleItems.map((item) => {
          const meta = typeMeta[item.type];
          const detail = [
            item.eventName ?? "General",
            item.amount != null ? formatDashboardCurrency(item.amount) : null,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", meta.dot)}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={cn("text-sm font-medium", meta.tone)}>
                    {meta.label}
                  </p>
                  <time className="text-[11px] text-zinc-500">
                    {formatRelativeTime(item.createdAt)}
                  </time>
                </div>
                <p className="mt-0.5 truncate text-sm text-zinc-300">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{detail}</p>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-1 inline-block text-xs text-purple-300 hover:text-purple-200"
                  >
                    Ver detalle
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex justify-end">
        <Link
          href={ROUTES.adminVentas}
          className="text-xs font-semibold text-purple-300 hover:text-purple-200"
        >
          Ver toda la actividad
        </Link>
      </div>
    </div>
  );
}
