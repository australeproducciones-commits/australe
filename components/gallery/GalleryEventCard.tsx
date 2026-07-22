import { EventImage } from "@/components/events/EventImage";
import { PublicButton } from "@/components/ui/public/PublicButton";import { ROUTES } from "@/lib/constants/routes";
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
    <article className="public-card group overflow-hidden rounded-3xl border transition motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <EventImage
        event={event}
        alt={`Galería de ${event.name}`}
        variant="card"
        roundedClass="rounded-none"
        className="aspect-[16/9] w-full border-0"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      <div className="space-y-4 p-5 text-center sm:p-6">
        <div className="flex justify-center">
          <span className="inline-flex rounded-full border border-[rgba(96,165,250,0.3)] bg-[rgba(96,165,250,0.1)] px-3 py-1 text-xs font-medium text-[#93c5fd]">
            Galería disponible
          </span>
        </div>
        <h2
          className="public-heading public-page-title mx-auto text-2xl font-bold"
          style={{ textWrap: "balance" }}
        >
          {event.name}
        </h2>
          {dateLabel ? (
            <p className="mt-2 text-sm public-text-soft">{dateLabel}</p>
          ) : null}
          {event.location_name ? (
            <p className="mt-1 text-sm public-text-soft">{event.location_name}</p>
          ) : null}
        <PublicButton href={ROUTES.galeria(event.slug)} variant="outline" size="sm" className="mx-auto">
          Ver galería
        </PublicButton>      </div>
    </article>
  );
}
