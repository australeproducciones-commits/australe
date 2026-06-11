import Link from "next/link";
import { EventImage } from "@/components/events/EventImage";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { formatEventDate, formatEventDateShort } from "@/lib/events/utils";

type HomeFeaturedSectionProps = {
  events: Event[];
};

export function HomeFeaturedSection({ events }: HomeFeaturedSectionProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-[#E8DDF8] bg-[#FFF9F4]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#D96C4A]">
            Destacados
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#2F2A3A] sm:text-3xl">
            Eventos en cartelera
          </h2>
        </div>

        <div className="space-y-8">
          {events.map((event) => (
            <article
              key={event.id}
              className="public-card overflow-hidden rounded-3xl transition hover:shadow-[0_16px_48px_rgba(75,55,110,0.12)]"
            >
              <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
                <Link href={ROUTES.evento(event.slug)} className="block p-3 sm:p-4">
                  <EventImage
                    event={event}
                    alt={event.name}
                    variant="banner"
                    className="rounded-2xl"
                  />
                </Link>
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  {event.featured_ticket_label ? (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-[#F2C14E]/30 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2F2A3A]">
                      {event.featured_ticket_label}
                    </span>
                  ) : (
                    <span className="mb-2 inline-flex w-fit rounded-full bg-[#9B7EDE]/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8568CC]">
                      Evento destacado
                    </span>
                  )}
                  <p className="text-sm font-medium text-[#9B7EDE]">
                    {formatEventDateShort(event.event_date)} ·{" "}
                    {formatEventDate(event.event_date).split(",")[0]}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#2F2A3A]">
                    {event.name}
                  </h3>
                  <p className="mt-2 text-sm text-[#6F647C]">
                    {event.location_name ?? "Ubicación a confirmar"}
                  </p>
                  <Link
                    href={ROUTES.evento(event.slug)}
                    className="public-btn-primary mt-6 inline-flex w-fit rounded-2xl px-6 py-3 text-sm font-semibold"
                  >
                    Ver evento
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
