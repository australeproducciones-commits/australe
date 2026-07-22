import { HomePremiumHeroClient } from "@/components/home/HomePremiumHeroClient";
import type { Event } from "@/lib/events/types";
import type { EventStreamWithEvent } from "@/lib/streaming/types";

type HomePremiumHeroProps = {
  featuredEvents: Event[];
  featuredStream: EventStreamWithEvent | null;
};

export function HomePremiumHero({
  featuredEvents,
  featuredStream,
}: HomePremiumHeroProps) {
  return (
    <HomePremiumHeroClient
      featuredEvents={featuredEvents}
      featuredStream={featuredStream}
    />
  );
}
