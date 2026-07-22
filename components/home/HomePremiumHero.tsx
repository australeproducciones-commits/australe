import { HomePremiumHeroClient } from "@/components/home/HomePremiumHeroClient";
import type { Event } from "@/lib/events/types";
import { getFeaturedHomeStream } from "@/lib/streaming/queries";

type HomePremiumHeroProps = {
  featuredEvents: Event[];
};

export async function HomePremiumHero({ featuredEvents }: HomePremiumHeroProps) {
  const featuredStream = await getFeaturedHomeStream();

  return (
    <HomePremiumHeroClient
      featuredEvents={featuredEvents}
      featuredStream={featuredStream}
    />
  );
}
