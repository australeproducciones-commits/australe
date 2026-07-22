import { HomePremiumHeroClient } from "@/components/home/HomePremiumHeroClient";
import type { EventStoreMerchContext } from "@/lib/events/storeMerchandising";
import type { Event } from "@/lib/events/types";
import { getStoreMerchFlagsForEvents } from "@/lib/store/queries";

type HomePremiumHeroProps = {
  featuredEvents: Event[];
};

export async function HomePremiumHero({ featuredEvents }: HomePremiumHeroProps) {
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
    <HomePremiumHeroClient
      featuredEvents={featuredEvents}
      storeMerchByEventId={storeMerchByEventId}
    />
  );
}
