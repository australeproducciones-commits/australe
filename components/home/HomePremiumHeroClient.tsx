"use client";

import { HomeFeaturedEventSlide } from "@/components/home/HomeFeaturedEventSlide";
import {
  HomeInstitutionalSlide,
  HomeInstitutionalSlideCompact,
} from "@/components/home/HomeInstitutionalSlide";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import type { Event } from "@/lib/events/types";

const AUTO_INTERVAL_MS = 6000;

type HomePremiumHeroClientProps = {
  featuredEvents: Event[];
  storeMerchByEventId?: Record<string, EventStoreMerchContext>;
};

export function HomePremiumHeroClient({
  featuredEvents,
  storeMerchByEventId = {},
}: HomePremiumHeroClientProps) {
  const eventSlides = featuredEvents.map((event, index) => (
    <HomeFeaturedEventSlide
      key={event.id}
      event={event}
      priority={index === 0}
      storeMerch={storeMerchByEventId[event.id] ?? null}
    />
  ));

  const slides =
    featuredEvents.length > 0
      ? [<HomeInstitutionalSlide key="institutional" />, ...eventSlides]
      : [<HomeInstitutionalSlideCompact key="institutional-empty" />];

  return (
    <section
      className="home-hero-premium store-hero-glow relative overflow-hidden border-b border-[var(--public-border)]"
      aria-label="Presentación Australe Producciones"
    >
      <HomeHeroCarousel
        ariaLabel="Destacados Australe"
        intervalMs={AUTO_INTERVAL_MS}
        slides={slides}
        showIndicators={slides.length > 1}
        className="relative"
      />
    </section>
  );
}
