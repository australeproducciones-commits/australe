import { EventImage } from "@/components/events/EventImage";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";
import { formatPublicEventDate } from "@/lib/events/formatPublicEventDate";
import type { Event } from "@/lib/events/types";

type GalleryEventCardProps = {
  event: Event;
};

export function GalleryEventCard({ event }: GalleryEventCardProps) {
  const dateLabel = event.event_date
    ? formatPublicEventDate(
        event.event_date,
        event.start_time,
        event.end_time,
        event.event_end_date,
      )
    : "";

  return (
    <article className="public-card group overflow-hidden rounded-3xl border transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_40px_rgba(75,55,110,0.12)]">
      <EventImage
        event={event}
        alt={`Galería de ${event.name}`}
        variant="card"
        roundedClass="rounded-none"
        className="aspect-[16/9] w-full border-0"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="public-label text-xs font-semibold uppercase tracking-[0.28em]">
            Galería
          </p>
          <h2 className="public-heading mt-2 text-2xl font-bold">{event.name}</h2>
          {dateLabel ? (
            <p className="mt-2 text-sm public-text-soft">{dateLabel}</p>
          ) : null}
          {event.location_name ? (
            <p className="mt-1 text-sm public-text-soft">{event.location_name}</p>
          ) : null}
        </div>
        <Button href={ROUTES.galeria(event.slug)} variant="secondary" size="sm">
          Ver galería
        </Button>
      </div>
    </article>
  );
}
