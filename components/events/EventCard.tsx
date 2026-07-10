import Link from "next/link";
import { EventImage } from "@/components/events/EventImage";
import { EventInfoBadge } from "@/components/events/EventInfoBadge";
import { EventInfoBadges } from "@/components/events/EventInfoBadges";
import { ROUTES } from "@/lib/constants/routes";
import { buildEventCardBadges } from "@/lib/events/eventInfoBadges";
import type { Event } from "@/lib/events/types";
import { formatTicketPrice } from "@/lib/tickets/utils";
import { cn } from "@/lib/utils/cn";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import { EVENT_STATUS } from "@/lib/constants/event-status";

type EventCardProps = {
  event: Event;
  minPrice?: number | null;
  minCommunityPrice?: number | null;
  featured?: boolean;
  storeMerch?: EventStoreMerchContext | null;
};

function getSaleStatusBadge(status: Event["status"]) {
  switch (status) {
    case EVENT_STATUS.SOLD_OUT:
      return { label: "Agotado", tone: "soldOut" as const };
    case EVENT_STATUS.PUBLISHED:
      return { label: "Entradas disponibles", tone: "success" as const };
    default:
      return { label: "Próximamente", tone: "upcoming" as const };
  }
}

export function EventCard({
  event,
  minPrice = null,
  minCommunityPrice = null,
  featured = false,
  storeMerch = null,
}: EventCardProps) {
  const badges = buildEventCardBadges({ event, minPrice, featured, storeMerch });
  const saleStatus = getSaleStatusBadge(event.status);

  return (
    <article
      className={cn(
        "group public-card flex h-full flex-col overflow-hidden rounded-2xl border transition motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_40px_rgba(75,55,110,0.12)]",
      )}
      style={{ borderColor: "var(--public-border)" }}
    >
      <Link
        href={ROUTES.evento(event.slug)}
        className="flex h-full flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]"
      >
        <EventImage
          event={event}
          alt={`Banner del evento ${event.name}`}
          variant="card"
          roundedClass="rounded-none rounded-t-2xl"
          className="w-full border-x-0 border-t-0"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 560px"
        />

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <EventInfoBadges badges={badges} size="compact" className="mb-3" />

          <h3 className="public-heading line-clamp-2 text-center text-lg font-bold leading-snug sm:text-xl">
            {event.name}
          </h3>

          {event.location_name ? (
            <p className="mt-2 text-center text-sm public-text-soft">
              {event.location_name}
            </p>
          ) : null}

          <div className="mt-auto space-y-2 pt-4">
            {minPrice != null ? (
              <p className="text-center text-sm public-text-muted">
                Desde{" "}
                <span className="public-heading text-base font-bold">
                  {formatTicketPrice(minPrice)}
                </span>
              </p>
            ) : (
              <p className="text-center text-sm public-text-soft">Consultar entradas</p>
            )}

            {minCommunityPrice != null ? (
              <p className="text-center text-xs public-text-soft sm:text-sm">
                Comunidad desde {formatTicketPrice(minCommunityPrice)}
              </p>
            ) : null}

            <div className="flex justify-center">
              <EventInfoBadge tone={saleStatus.tone}>{saleStatus.label}</EventInfoBadge>
            </div>

            <span className="public-btn-primary mt-3 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold">
              Ver evento
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
