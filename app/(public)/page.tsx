import { HomeEventsSection } from "@/components/home/HomeEventsSection";
import { HomePremiumHero } from "@/components/home/HomePremiumHero";
import { HomeStoreSection } from "@/components/home/HomeStoreSection";
import { HomeStreamingSection } from "@/components/home/HomeStreamingSection";
import { PublicQueryError } from "@/components/ui/PublicQueryError";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import { filterCarteleraEvents } from "@/lib/events/filters";
import {
  getFeaturedEventsForHome,
  getPublishedEvents,
} from "@/lib/events/queries";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";
import { getFeaturedHomeStream } from "@/lib/streaming/queries";
import type { Event } from "@/lib/events/types";

export default async function Home() {
  let featuredEvents: Event[] = [];
  let carteleraItems: Awaited<ReturnType<typeof buildCarteleraEvents>> = [];
  let featuredStream: Awaited<ReturnType<typeof getFeaturedHomeStream>> = null;
  let loadError: string | null = null;

  try {
    const [publishedEvents, stream] = await Promise.all([
      getPublishedEvents(),
      getFeaturedHomeStream(),
    ]);
    featuredStream = stream;
    featuredEvents = await getFeaturedEventsForHome(publishedEvents);
    carteleraItems = await buildCarteleraEvents(
      filterCarteleraEvents(publishedEvents),
      featuredEvents.find((event) => event.content_kind === "event")?.id,
    );
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      loadError = error.userMessage;
    } else {
      throw error;
    }
  }

  return (
    <div className="home-premium">
      {loadError ? (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <PublicQueryError message={loadError} />
        </div>
      ) : (
        <>
          <HomePremiumHero
            featuredEvents={featuredEvents}
            featuredStream={featuredStream}
          />
          <HomeEventsSection items={carteleraItems} />
          <HomeStoreSection />
          <HomeStreamingSection />
        </>
      )}
    </div>
  );
}
