import { CommunitySection } from "@/components/home/CommunitySection";
import { FeaturedEventsHero } from "@/components/home/FeaturedEventsHero";
import { HomeCartelera } from "@/components/home/HomeCartelera";
import { PublicQueryError } from "@/components/ui/PublicQueryError";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import {
  getFeaturedEventsForHome,
  getPublishedEvents,
} from "@/lib/events/queries";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";
import type { Event } from "@/lib/events/types";

export default async function Home() {
  let featuredEvents: Event[] = [];
  let publishedEvents: Event[] = [];
  let loadError: string | null = null;

  try {
    [featuredEvents, publishedEvents] = await Promise.all([
      getFeaturedEventsForHome(),
      getPublishedEvents(),
    ]);
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      loadError = error.userMessage;
    } else {
      throw error;
    }
  }

  const carteleraItems = loadError
    ? []
    : await buildCarteleraEvents(
        publishedEvents,
        featuredEvents[0]?.id,
      );

  return (
    <main>
      {loadError ? (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <PublicQueryError message={loadError} />
        </div>
      ) : (
        <>
          <FeaturedEventsHero events={featuredEvents} />
          <HomeCartelera items={carteleraItems} />
        </>
      )}
      <CommunitySection />
    </main>
  );
}
