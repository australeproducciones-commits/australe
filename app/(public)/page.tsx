import { HomeCartelera } from "@/components/home/HomeCartelera";
import { HomeCommunityStrip } from "@/components/home/HomeCommunityStrip";
import { HomeHero } from "@/components/home/HomeHero";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import {
  getFeaturedPublishedEvent,
  getPublishedEvents,
} from "@/lib/events/queries";

export default async function Home() {
  const [featuredEvent, publishedEvents] = await Promise.all([
    getFeaturedPublishedEvent(),
    getPublishedEvents(),
  ]);

  const carteleraItems = await buildCarteleraEvents(
    publishedEvents,
    featuredEvent?.id,
  );

  return (
    <main className="bg-zinc-950">
      <HomeHero />
      <HomeCartelera items={carteleraItems} />
      <HomeCommunityStrip />
    </main>
  );
}
