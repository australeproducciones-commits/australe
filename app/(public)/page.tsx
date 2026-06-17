import { CommunitySection } from "@/components/home/CommunitySection";
import { FeaturedEventsHero } from "@/components/home/FeaturedEventsHero";
import { HomeCartelera } from "@/components/home/HomeCartelera";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import {
  getFeaturedEventsForHome,
  getPublishedEvents,
} from "@/lib/events/queries";

export default async function Home() {
  const [featuredEvents, publishedEvents] = await Promise.all([
    getFeaturedEventsForHome(),
    getPublishedEvents(),
  ]);

  const carteleraItems = await buildCarteleraEvents(
    publishedEvents,
    featuredEvents[0]?.id,
  );

  return (
    <main>
      <FeaturedEventsHero events={featuredEvents} />
      <HomeCartelera items={carteleraItems} />
      <CommunitySection />
    </main>
  );
}
