"use client";

import { HomeFeaturedEventSlide } from "@/components/home/HomeFeaturedEventSlide";
import { HomeHeroCarousel } from "@/components/home/HomeHeroCarousel";
import { HomeStreamingHeroSlide } from "@/components/home/HomeStreamingHeroSlide";
import type { Event } from "@/lib/events/types";
import type { EventStreamWithEvent } from "@/lib/streaming/types";

const AUTO_INTERVAL_MS = 6000;

type HomePremiumHeroClientProps = {
  featuredEvents: Event[];
  featuredStream?: EventStreamWithEvent | null;
};

export function HomePremiumHeroClient({
  featuredEvents,
  featuredStream = null,
}: HomePremiumHeroClientProps) {
  const eventSlides = featuredEvents.map((event, index) => (
    <HomeFeaturedEventSlide
      key={event.id}
      event={event}
      priority={index === 0 && !featuredStream}
    />
  ));

  const streamSlide = featuredStream ? (
    <HomeStreamingHeroSlide
      key={`stream-${featuredStream.id}`}
      stream={featuredStream}
      priority={featuredEvents.length === 0}
    />
  ) : null;

  const slides = streamSlide ? [...eventSlides, streamSlide] : eventSlides;

  if (slides.length === 0) {
    return null;
  }

  return (
    <section
      className="home-hero-premium relative overflow-hidden border-b border-[var(--public-border)]"
      aria-label="Destacados Australe"
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
