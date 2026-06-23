import Link from "next/link";
import { EventHero } from "@/components/events/EventHero";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { formatEventDateShort } from "@/lib/events/utils";

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
            <article key={event.id}>
              <EventHero
                event={event}
                titleAs="h2"
                className="shadow-[0_12px_40px_rgba(75,55,110,0.08)]"
              />
              <p className="mt-3 text-center text-xs text-[#8B7A99]">
                {formatEventDateShort(event.event_date)} ·{" "}
                <Link href={ROUTES.evento(event.slug)} className="public-link">
                  Ver ficha completa
                </Link>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
