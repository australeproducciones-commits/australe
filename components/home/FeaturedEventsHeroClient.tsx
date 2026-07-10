"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { EventHero } from "@/components/events/EventHero";
import { ROUTES } from "@/lib/constants/routes";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import type { Event } from "@/lib/events/types";
import { cn } from "@/lib/utils/cn";

const AUTO_INTERVAL_MS = 6000;

type FeaturedEventsHeroClientProps = {
  events: Event[];
  storeMerchByEventId?: Record<string, EventStoreMerchContext>;
};

function resolveEventBannerLink(event: Event): string | null {
  const slug = event.slug?.trim();
  return slug ? ROUTES.evento(slug) : null;
}

type CarouselNavButtonProps = {
  direction: "prev" | "next";
  label: string;
  onClick: () => void;
};

function CarouselNavButton({ direction, label, onClick }: CarouselNavButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full border text-lg font-semibold backdrop-blur-sm transition",
        "h-8 w-8 sm:h-9 sm:w-9",
        "hover:border-[var(--public-primary)] hover:bg-[var(--public-card)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--public-primary)]",
        "disabled:pointer-events-none disabled:opacity-40",
        direction === "prev" ? "left-2 sm:left-3" : "right-2 sm:right-3",
      )}
      style={{
        borderColor: "var(--public-border)",
        color: "var(--public-primary)",
        backgroundColor: "color-mix(in srgb, var(--public-card-tint) 88%, transparent)",
      }}
      aria-label={label}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}

export function FeaturedEventsHeroClient({
  events,
  storeMerchByEventId = {},
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
  const bannerLink = resolveEventBannerLink(event);
  const showCarouselControls = count > 1;

  const bannerControls = showCarouselControls ? (
    <>
      <CarouselNavButton direction="prev" label="Evento anterior" onClick={goPrev} />
      <CarouselNavButton direction="next" label="Siguiente evento" onClick={goNext} />
    </>
  ) : null;

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
          <EventHero
            event={event}
            priority={index === 0}
            bannerLink={bannerLink}
            bannerControls={bannerControls}
            storeMerch={storeMerchByEventId[event.id] ?? null}
            bannerOnly
          />
        </div>
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
