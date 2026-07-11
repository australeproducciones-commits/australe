"use client";

import Link from "next/link";
import { EventHero } from "@/components/events/EventHero";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import { ROUTES } from "@/lib/constants/routes";
import { isPromotionContent } from "@/lib/events/contentRules";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import type { Event } from "@/lib/events/types";

const AUTO_INTERVAL_MS = 5500;

type FeaturedEventsHeroClientProps = {
  events: Event[];
  storeMerchByEventId?: Record<string, EventStoreMerchContext>;
};

function resolveEventBannerLink(event: Event): string | null {
  if (isPromotionContent(event)) {
    return null;
  }

  const slug = event.slug?.trim();
  return slug ? ROUTES.evento(slug) : null;
}

export function FeaturedEventsHeroClient({
  events,
  storeMerchByEventId = {},
}: FeaturedEventsHeroClientProps) {
  if (events.length === 0) {
    return (
      <section
        className="relative overflow-hidden border-b"
        style={{
          borderColor: "var(--public-border)",
          backgroundColor: "var(--public-bg)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <FeaturedHeroEmptyCard />
        </div>
      </section>
    );
  }

  const slides = events.map((event) => (
    <EventHero
      key={event.id}
      event={event}
      priority={event === events[0]}
      bannerLink={resolveEventBannerLink(event)}
      storeMerch={storeMerchByEventId[event.id] ?? null}
      bannerOnly
    />
  ));

  return (
    <section
      className="relative overflow-hidden border-b"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-bg)",
      }}
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
        <HomeHeroCarousel
          ariaLabel="Destacados Australe"
          intervalMs={AUTO_INTERVAL_MS}
          slides={slides}
        />
      </div>
    </section>
  );
}

function FeaturedHeroEmptyCard() {
  return (
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
  );
}
