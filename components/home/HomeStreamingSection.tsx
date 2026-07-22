import { HomeReveal } from "@/components/home/HomeReveal";
import { StreamingCard } from "@/components/streaming/StreamingCard";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import type { EventStreamWithEvent } from "@/lib/streaming/types";

type HomeStreamingSectionProps = {
  featuredStream: EventStreamWithEvent | null;
};

export function HomeStreamingSection({ featuredStream }: HomeStreamingSectionProps) {
  if (!featuredStream) {
    return null;
  }

  return (
    <section
      id="streaming"
      className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <HomeReveal>
        <SectionHeading
          label="Streaming"
          title="Esto también se vive en pantalla"
          subtitle="Charlas, encuentros, eventos y contenido para seguir conectados estés donde estés."
        />
      </HomeReveal>

      <HomeReveal className="mt-10" delayMs={80}>
        <div className="home-streaming-card">
          <StreamingCard stream={featuredStream} />
        </div>
      </HomeReveal>
    </section>
  );
}
