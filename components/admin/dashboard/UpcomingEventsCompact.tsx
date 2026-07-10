import Image from "next/image";
import Link from "next/link";
import type { EventDashboardRow } from "@/lib/admin/dashboard/types";
import { getEventImageSource } from "@/lib/events/getEventImage";
import { ROUTES } from "@/lib/constants/routes";
import { formatEventDate, formatTime } from "@/lib/events/utils";
import { formatDashboardCurrency } from "@/lib/admin/dashboard/formatters";

type UpcomingEventsCompactProps = {
  rows: EventDashboardRow[];
};

export function UpcomingEventsCompact({ rows }: UpcomingEventsCompactProps) {
  const visibleRows = rows.slice(0, 4);

  if (visibleRows.length === 0) {
    return (
      <p className="text-sm text-zinc-400">No hay eventos próximos programados.</p>
    );
  }

  return (
    <div className="space-y-2">
      {visibleRows.map((row) => {
        const imageUrl = getEventImageSource(row.event);
        return (
          <article
            key={row.event.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950/50 p-3"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
                  —
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">
                {row.event.name}
              </p>
              <p className="truncate text-xs text-zinc-400">
                {formatEventDate(row.event.event_date)}
                {formatTime(row.event.start_time)
                  ? ` · ${formatTime(row.event.start_time)}`
                  : ""}{" "}
                · {row.timing.shortLabel}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {row.ticketsSold} entradas · {formatDashboardCurrency(row.revenue)}
              </p>
            </div>
            <Link
              href={ROUTES.adminEvento(row.event.id)}
              className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-white/5"
            >
              Abrir
            </Link>
          </article>
        );
      })}
      <div className="flex justify-end">
        <Link
          href={ROUTES.adminEventos}
          className="text-xs font-semibold text-purple-300 hover:text-purple-200"
        >
          Ver todos los eventos
        </Link>
      </div>
    </div>
  );
}
