import { FeaturedEventsHeroClient } from "@/components/home/FeaturedEventsHeroClient";
import { getFeaturedEventsForHome } from "@/lib/events/queries";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import type { Event } from "@/lib/events/types";
import { getStoreMerchFlagsForEvents } from "@/lib/store/queries";

type FeaturedEventsHeroProps = {
  events?: Event[];
};

export async function FeaturedEventsHero({ events }: FeaturedEventsHeroProps) {
  const featuredEvents = events ?? (await getFeaturedEventsForHome());
  const merchFlags = await getStoreMerchFlagsForEvents(
    featuredEvents.map((event) => event.id),
  );

  const storeMerchByEventId: Record<string, EventStoreMerchContext> = {};

  for (const event of featuredEvents) {
    const flag = merchFlags.get(event.id);
    if (flag?.hasMerch) {
      storeMerchByEventId[event.id] = {
        eventId: event.id,
        eventSlug: event.slug,
        eventStatus: event.status,
        hasMerch: true,
        badgeText: flag.badgeText,
        showBlock: true,
      };
    }
  }

  return (
    <FeaturedEventsHeroClient
      events={featuredEvents}
      storeMerchByEventId={storeMerchByEventId}
    />
  );
}
