import Link from "next/link";
import { EventImage } from "@/components/events/EventImage";
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
  showFullDateTime?: boolean;
  surface?: "light" | "dark";
  showCommunityBadge?: boolean;
};

function getPublicStatusBadge(status: Event["status"], light: boolean) {
  switch (status) {
    case EVENT_STATUS.SOLD_OUT:
      return {
        label: "Agotado",
        className: light
          ? "bg-amber-100 text-amber-800"
          : "bg-amber-400/15 text-amber-200",
      };
    case EVENT_STATUS.PUBLISHED:
      return {
        label: "Disponible",
        className: light
          ? "bg-[#7FD8BE]/25 text-[#2F6F5E]"
          : "bg-emerald-400/15 text-emerald-200",
      };
    default:
      return {
        label: "Próximamente",
        className: light
          ? "bg-[#F1E8FF] text-[#8568CC]"
          : "bg-purple-400/15 text-purple-200",
      };
  }
}

export function EventCard({
  event,
  minPrice = null,
  featured = false,
  showFullDateTime = false,
  surface = "light",
  showCommunityBadge = false,
}: EventCardProps) {
  const light = surface === "light";
  const dateLabel = showFullDateTime
    ? formatEventDateTime(event.event_date, event.start_time, event.end_time)
    : formatEventDate(event.event_date);
  const statusBadge = getPublicStatusBadge(event.status, light);

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl transition duration-300",
        light
          ? "public-card hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(75,55,110,0.12)]"
          : "border border-white/10 bg-zinc-900/50 shadow-lg shadow-black/25 hover:border-purple-400/25",
      )}
    >
      <Link href={ROUTES.evento(event.slug)} className="block p-3 pb-0">
        <div className="relative">
          <EventImage event={event} alt={event.name} variant="card" />
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {featured ? (
              <span className="rounded-full bg-[#9B7EDE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                Destacado
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                statusBadge.className,
              )}
            >
              {statusBadge.label}
            </span>
            {showCommunityBadge ? (
              <span className="rounded-full bg-[#F2C14E]/35 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#2F2A3A]">
                Comunidad
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4 pt-3">
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            light ? "text-[#9B7EDE]" : "text-purple-300",
          )}
        >
          {dateLabel}
        </p>
        <h3
          className={cn(
            "mt-1 line-clamp-2 text-lg font-bold leading-snug",
            light ? "text-[#2F2A3A]" : "text-white",
          )}
        >
          {event.name}
        </h3>
        <p
          className={cn(
            "mt-2 line-clamp-1 text-sm",
            light ? "text-[#8B7A99]" : "text-zinc-400",
          )}
        >
          {event.location_name ?? "Ubicación a confirmar"}
        </p>

        <div className="mt-auto pt-4">
          {minPrice != null ? (
            <p className={cn("text-sm", light ? "text-[#6F647C]" : "text-zinc-300")}>
              Desde{" "}
              <span className={cn("font-bold", light ? "text-[#2F2A3A]" : "text-white")}>
                {formatTicketPrice(minPrice)}
              </span>
            </p>
          ) : (
            <p className={cn("text-sm", light ? "text-[#8B7A99]" : "text-zinc-500")}>
              Consultar entradas
            </p>
          )}

          <Link
            href={ROUTES.evento(event.slug)}
            className={cn(
              "mt-3 flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition",
              light
                ? "bg-[#9B7EDE] text-white hover:bg-[#8568CC]"
                : "bg-purple-500 text-white hover:bg-purple-400",
            )}
          >
            Ver evento
          </Link>
        </div>
      </div>
    </article>
  );
}
