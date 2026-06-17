import { FeaturedEventsHeroClient } from "@/components/home/FeaturedEventsHeroClient";
import { getFeaturedEventsForHome } from "@/lib/events/queries";
import type { Event } from "@/lib/events/types";

type FeaturedEventsHeroProps = {
  events?: Event[];
};

export async function FeaturedEventsHero({ events }: FeaturedEventsHeroProps) {
  const featuredEvents = events ?? (await getFeaturedEventsForHome());

  return <FeaturedEventsHeroClient events={featuredEvents} />;
}
