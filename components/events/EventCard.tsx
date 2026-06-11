import Link from "next/link";
import { EventFlyer } from "@/components/events/EventFlyer";
import { Button } from "@/components/ui/Button";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { formatEventDate, formatEventDateTime } from "@/lib/events/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { cn } from "@/lib/utils/cn";

type EventCardProps = {
  event: Event;
  minPrice?: number | null;
  featured?: boolean;
  variant?: "default" | "spotlight";
  showFullDateTime?: boolean;
};

function getPublicStatusBadge(status: Event["status"]) {
  switch (status) {
    case EVENT_STATUS.SOLD_OUT:
      return { label: "Agotado", className: "bg-amber-400/15 text-amber-200" };
    case EVENT_STATUS.PUBLISHED:
      return { label: "Disponible", className: "bg-emerald-400/15 text-emerald-200" };
    case EVENT_STATUS.FINISHED:
      return { label: "Finalizado", className: "bg-zinc-500/20 text-zinc-400" };
    case EVENT_STATUS.CANCELLED:
      return { label: "Cancelado", className: "bg-red-400/15 text-red-200" };
    default:
      return { label: "Próximamente", className: "bg-purple-400/15 text-purple-200" };
  }
}

export function EventCard({
  event,
  minPrice = null,
  featured = false,
  variant = "default",
  showFullDateTime = false,
}: EventCardProps) {
  const isSpotlight = variant === "spotlight" || featured;
  const dateLabel = showFullDateTime
    ? formatEventDateTime(event.event_date, event.start_time, event.end_time)
    : formatEventDate(event.event_date);
  const statusBadge = getPublicStatusBadge(event.status);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-lg shadow-black/25 transition duration-300 hover:border-purple-400/25 hover:shadow-xl hover:shadow-purple-950/20",
        isSpotlight ? "md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" : "",
      )}
    >
      <Link
        href={ROUTES.evento(event.slug)}
        className={cn(
          "relative block overflow-hidden",
          isSpotlight ? "min-h-[280px] md:min-h-[360px]" : "aspect-[4/5] sm:aspect-[5/6]",
        )}
      >
        <EventFlyer
          event={event}
          purpose="card"
          className="absolute inset-0 h-full w-full rounded-none border-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {featured ? (
            <span className="rounded-full bg-purple-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
              Destacado
            </span>
          ) : null}
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm",
              statusBadge.className,
            )}
          >
            {statusBadge.label}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-purple-200">
            {dateLabel}
          </p>
          <h3
            className={cn(
              "mt-1 font-black leading-tight text-white",
              isSpotlight ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
            )}
          >
            {event.name}
          </h3>
        </div>
      </Link>

      <div
        className={cn(
          "flex flex-col justify-between gap-4 p-4 sm:p-5",
          isSpotlight ? "md:py-8 md:pr-8" : "",
        )}
      >
        <div className="space-y-2 text-sm">
          <p className="flex items-start gap-2 text-zinc-400">
            <span className="mt-0.5 shrink-0 text-purple-400" aria-hidden>
              ◎
            </span>
            <span>{event.location_name ?? "Ubicación a confirmar"}</span>
          </p>
          {minPrice != null ? (
            <p className="text-sm text-zinc-300">
              Desde{" "}
              <span className="font-bold text-white">
                {formatTicketPrice(minPrice)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-zinc-500">Consultar entradas</p>
          )}
        </div>

        <Button
          href={ROUTES.evento(event.slug)}
          className="w-full"
          size={isSpotlight ? "lg" : "md"}
        >
          Ver evento
        </Button>
      </div>
    </article>
  );
}
