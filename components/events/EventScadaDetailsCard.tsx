import {
  BuildingIcon,
  CalendarIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from "@/components/icons/PublicScadaIcons";
import { formatPublicEventDate } from "@/lib/events/formatPublicEventDate";
import type { Event } from "@/lib/events/types";
import { getGoogleMapsSearchUrl } from "@/lib/utils/googleMaps";
import { cn } from "@/lib/utils/cn";

type EventScadaDetailsCardProps = {
  event: Pick<
    Event,
    | "name"
    | "description"
    | "event_date"
    | "start_time"
    | "end_time"
    | "location_name"
    | "address"
  >;
  className?: string;
};

export function EventScadaDetailsCard({
  event,
  className,
}: EventScadaDetailsCardProps) {
  const dateLabel = formatPublicEventDate(
    event.event_date,
    event.start_time,
    event.end_time,
  );
  const locationName = event.location_name?.trim() ?? "";
  const address = event.address?.trim() ?? "";
  const placeMapsUrl = locationName ? getGoogleMapsSearchUrl(locationName) : null;
  const addressMapsUrl = address ? getGoogleMapsSearchUrl(address) : null;

  return (
    <article className={cn("public-scada-event-card public-card rounded-2xl", className)}>
      <div className="public-scada-event-card__header">
        <span className="public-scada-kicker">EVENTO</span>
        <h1 className="public-scada-event-card__title public-heading mt-3 text-3xl font-black leading-tight sm:text-4xl">
          {event.name}
        </h1>

        {dateLabel ? (
          <div className="public-scada-date-badge mt-4 inline-flex max-w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-sm sm:items-center">
            <CalendarIcon className="mt-0.5 text-[var(--public-primary)] sm:mt-0" />
            <span className="public-heading font-medium leading-snug break-words">
              {dateLabel}
            </span>
          </div>
        ) : null}
      </div>

      {locationName || address ? (
        <div className="public-scada-location-grid mt-6">
          {locationName && placeMapsUrl ? (
            <div className="public-scada-location-row">
              <div className="public-scada-location-row__icon" aria-hidden>
                <MapPinIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="public-scada-label">LUGAR</p>
                <a
                  href={placeMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="public-scada-location-link group mt-1 inline-flex max-w-full items-center gap-2 break-words"
                  aria-label={`Abrir ${locationName} en Google Maps`}
                >
                  <span className="public-heading font-semibold">{locationName}</span>
                  <ExternalLinkIcon className="text-[var(--public-primary)] opacity-80 transition group-hover:opacity-100" />
                </a>
              </div>
            </div>
          ) : null}

          {address && addressMapsUrl ? (
            <div className="public-scada-location-row">
              <div className="public-scada-location-row__icon" aria-hidden>
                <BuildingIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="public-scada-label">DIRECCIÓN</p>
                <a
                  href={addressMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="public-scada-location-link group mt-1 inline-flex max-w-full items-start gap-2 break-words"
                  aria-label={`Abrir dirección en Google Maps: ${address}`}
                >
                  <span className="public-heading font-semibold leading-relaxed">
                    {address}
                  </span>
                  <ExternalLinkIcon className="mt-1 text-[var(--public-primary)] opacity-80 transition group-hover:opacity-100" />
                </a>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {event.description ? (
        <section
          className="public-scada-description-panel mt-8"
          aria-label="Descripción del evento"
        >
          <p className="public-scada-label mb-3">DESCRIPCIÓN</p>
          <p className="whitespace-pre-line text-base leading-7 public-text-muted sm:text-[1.05rem]">
            {event.description}
          </p>
        </section>
      ) : null}
    </article>
  );
}
