"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventHero } from "@/components/events/EventHero";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import { cn } from "@/lib/utils/cn";

const AUTO_INTERVAL_MS = 6000;

type FeaturedEventsHeroClientProps = {
  events: Event[];
};

export function FeaturedEventsHeroClient({
  events,
}: FeaturedEventsHeroClientProps) {
  const [index, setIndex] = useState(0);
  const count = events.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) {
        return;
      }
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (count <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTO_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [count]);

  if (count === 0) {
    return <FeaturedHeroEmpty />;
  }

  const event = events[index] ?? events[0];

  return (
    <section
      className="relative overflow-hidden border-b"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg)",
      }}
      aria-roledescription="carousel"
      aria-label="Eventos destacados"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
        <div className="motion-safe:transition-opacity motion-safe:duration-300">
          <EventHero event={event} priority={index === 0} />
        </div>

        {count > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-[var(--public-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]"
              style={{
                borderColor: "var(--public-border)",
                color: "var(--public-primary)",
                backgroundColor: "var(--public-card-tint)",
              }}
              aria-label="Evento anterior"
            >
              ‹
            </button>

            <div className="flex items-center gap-2" role="tablist">
              {events.map((item, dotIndex) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={dotIndex === index}
                  aria-label={`Ir a ${item.name}`}
                  onClick={() => goTo(dotIndex)}
                  className={cn(
                    "h-2.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]",
                    dotIndex === index
                      ? "w-8 bg-[var(--public-primary)]"
                      : "w-2.5 hover:bg-[var(--public-secondary)]",
                  )}
                  style={
                    dotIndex === index
                      ? undefined
                      : { backgroundColor: "var(--public-border)" }
                  }
                />
              ))}
            </div>

            <button
              type="button"
              onClick={goNext}
              className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:bg-[var(--public-card)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]"
              style={{
                borderColor: "var(--public-border)",
                color: "var(--public-primary)",
                backgroundColor: "var(--public-card-tint)",
              }}
              aria-label="Siguiente evento"
            >
              ›
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FeaturedHeroEmpty() {
  return (
    <section
      className="border-b"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="public-card mx-auto max-w-2xl rounded-3xl px-8 py-12 text-center">
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Cartelera
          </p>
          <h1 className="public-heading mt-4 text-3xl font-black sm:text-4xl">
            Próximos encuentros
          </h1>
          <p className="mt-4 text-base leading-relaxed public-text-muted">
            Muy pronto nuevas fechas de Australe Producciones.
          </p>
          <Link
            href={ROUTES.eventos}
            className="public-btn-primary mt-8 inline-flex rounded-2xl px-8 py-4 text-sm font-semibold"
          >
            Ver cartelera
          </Link>
        </div>
      </div>
    </section>
  );
}
