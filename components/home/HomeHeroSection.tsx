import { FeaturedEventsHero } from "@/components/home/FeaturedEventsHero";
import { StreamingHero } from "@/components/streaming/StreamingCard";
import { getFeaturedHomeStream } from "@/lib/streaming/queries";
import type { Event } from "@/lib/events/types";

type HomeHeroSectionProps = {
  featuredEvents: Event[];
};

export async function HomeHeroSection({ featuredEvents }: HomeHeroSectionProps) {
  const featuredStream = await getFeaturedHomeStream();

  if (featuredStream) {
    return (
      <section
        className="border-b"
        style={{
          borderColor: "var(--public-border)",
          backgroundColor: "var(--public-bg)",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
          <StreamingHero stream={featuredStream} />
        </div>
      </section>
    );
  }

  return <FeaturedEventsHero events={featuredEvents} />;
}
