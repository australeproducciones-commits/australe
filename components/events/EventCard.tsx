import Link from "next/link";
import { EventImage } from "@/components/events/EventImage";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { formatEventDate, formatEventDateTime } from "@/lib/events/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import { cn } from "@/lib/utils/cn";

type EventCardProps = {
  event: Event;
  minPrice?: number | null;
  featured?: boolean;
  showFullDateTime?: boolean;
  showCommunityBadge?: boolean;
};

function getPublicStatusBadge(status: Event["status"]) {
  switch (status) {
    case EVENT_STATUS.SOLD_OUT:
      return { label: "Agotado", tone: "warning" as const };
    case EVENT_STATUS.PUBLISHED:
      return { label: "Disponible", tone: "success" as const };
    default:
      return { label: "Próximamente", tone: "primary" as const };
  }
}

export function EventCard({
  event,
  minPrice = null,
  featured = false,
  showFullDateTime = false,
  showCommunityBadge = false,
}: EventCardProps) {
  const dateLabel = showFullDateTime
    ? formatEventDateTime(event.event_date, event.start_time, event.end_time)
    : formatEventDate(event.event_date);
  const statusBadge = getPublicStatusBadge(event.status);

  return (
    <article
      className={cn(
        "group public-card flex h-full flex-col overflow-hidden rounded-2xl transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(75,55,110,0.12)]",
      )}
    >
      <Link href={ROUTES.evento(event.slug)} className="block p-3 pb-0">
        <div className="relative">
          <EventImage event={event} alt={event.name} variant="card" />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {featured ? (
              <StatusBadge tone="featured">Destacado</StatusBadge>
            ) : null}
            <StatusBadge tone={statusBadge.tone}>{statusBadge.label}</StatusBadge>
            {showCommunityBadge ? (
              <StatusBadge tone="community">Comunidad</StatusBadge>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <p className="public-label text-xs font-semibold uppercase tracking-wider">
          {dateLabel}
        </p>
        <h3 className="public-heading mt-1 line-clamp-2 text-lg font-bold leading-snug">
          {event.name}
        </h3>
        <p className="mt-2 line-clamp-1 text-sm public-text-soft">
          {event.location_name ?? "Ubicación a confirmar"}
        </p>

        <div className="mt-auto pt-4">
          {minPrice != null ? (
            <p className="text-sm public-text-muted">
              Desde{" "}
              <span className="public-heading font-bold">
                {formatTicketPrice(minPrice)}
              </span>
            </p>
          ) : (
            <p className="text-sm public-text-soft">Consultar entradas</p>
          )}

          <Link
            href={ROUTES.evento(event.slug)}
            className="public-btn-primary mt-3 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold"
          >
            Ver evento
          </Link>
        </div>
      </div>
    </article>
  );
}
