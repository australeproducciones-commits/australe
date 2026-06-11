import { CommunitySection } from "@/components/home/CommunitySection";
import { HomeCartelera } from "@/components/home/HomeCartelera";
import { HomeFeaturedSection } from "@/components/home/HomeFeaturedSection";
import { HomeHero } from "@/components/home/HomeHero";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import {
  getFeaturedPublishedEvents,
  getPublishedEvents,
} from "@/lib/events/queries";

export default async function Home() {
  const [featuredEvents, publishedEvents] = await Promise.all([
    getFeaturedPublishedEvents(),
    getPublishedEvents(),
  ]);

  const carteleraItems = await buildCarteleraEvents(
    publishedEvents,
    featuredEvents[0]?.id,
  );

  return (
    <main>
      <HomeHero featuredEvent={featuredEvents[0] ?? null} />
      <HomeFeaturedSection events={featuredEvents} />
      <HomeCartelera items={carteleraItems} />
      <CommunitySection />
    </main>
  );
}
