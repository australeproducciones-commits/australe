import { HomeCommunitySection } from "@/components/home/HomeCommunitySection";
import { HomeEventsSection } from "@/components/home/HomeEventsSection";
import { HomeExperienceSection } from "@/components/home/HomeExperienceSection";
import { HomeFinalCta } from "@/components/home/HomeFinalCta";
import { HomePremiumHero } from "@/components/home/HomePremiumHero";
import { HomePremiumTheme } from "@/components/home/HomePremiumTheme";
import { HomeStoreSection } from "@/components/home/HomeStoreSection";
import { HomeStreamingSection } from "@/components/home/HomeStreamingSection";
import { HomeTrustBar } from "@/components/home/HomeTrustBar";
import { PublicQueryError } from "@/components/ui/PublicQueryError";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import { filterCarteleraEvents } from "@/lib/events/filters";
import {
  getFeaturedEventsForHome,
  getPublishedEvents,
} from "@/lib/events/queries";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";
import type { Event } from "@/lib/events/types";

export default async function Home() {
  let featuredEvents: Event[] = [];
  let carteleraItems: Awaited<ReturnType<typeof buildCarteleraEvents>> = [];
  let loadError: string | null = null;

  try {
    const publishedEvents = await getPublishedEvents();
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
    <HomePremiumTheme>
      <main className="home-premium">
        {loadError ? (
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
            <PublicQueryError message={loadError} />
          </div>
        ) : (
          <>
            <HomePremiumHero featuredEvents={featuredEvents} />
            <HomeTrustBar />
            <HomeEventsSection items={carteleraItems} />
            <HomeExperienceSection />
            <HomeCommunitySection />
            <HomeStoreSection />
            <HomeStreamingSection />
            <HomeFinalCta />
          </>
        )}
      </main>
    </HomePremiumTheme>
  );
}
