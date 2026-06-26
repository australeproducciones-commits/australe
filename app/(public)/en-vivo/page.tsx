import type { Metadata } from "next";
import { PageContainer, SectionHeading } from "@/components/ui/public";
import {
  StreamingCard,
  StreamingEmptyState,
} from "@/components/streaming/StreamingCard";
import {
  getPublicStreamsForPage,
  groupPublicStreams,
} from "@/lib/streaming/queries";

export const metadata: Metadata = {
  title: "En vivo",
  description: "Transmisiones en vivo de Australe Producciones",
};

export default async function EnVivoPage() {
  const streams = await getPublicStreamsForPage();
  const groups = groupPublicStreams(streams);
  const hasAny =
    groups.live.length > 0 ||
    groups.upcoming.length > 0 ||
    groups.paused.length > 0 ||
    groups.ended.length > 0;

  if (!hasAny) {
    return (
      <PageContainer>
        <StreamingEmptyState />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionHeading
        label="Streaming"
        title="En vivo"
        subtitle="Seguí las transmisiones de Australe Producciones."
      />

      <div className="mt-10 space-y-12">
        {groups.live.length > 0 ? (
          <section aria-labelledby="live-heading">
            <h2 id="live-heading" className="mb-5 text-2xl font-black text-purple-950">
              Ahora en vivo
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {groups.live.map((stream) => (
                <StreamingCard key={stream.id} stream={stream} />
              ))}
            </div>
          </section>
        ) : null}

        {groups.upcoming.length > 0 ? (
          <section aria-labelledby="upcoming-heading">
            <h2 id="upcoming-heading" className="mb-5 text-2xl font-black text-purple-950">
              Próximas transmisiones
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {groups.upcoming.map((stream) => (
                <StreamingCard key={stream.id} stream={stream} />
              ))}
            </div>
          </section>
        ) : null}

        {groups.paused.length > 0 ? (
          <section aria-labelledby="paused-heading">
            <h2 id="paused-heading" className="mb-5 text-2xl font-black text-purple-950">
              Pausadas
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {groups.paused.map((stream) => (
                <StreamingCard key={stream.id} stream={stream} />
              ))}
            </div>
          </section>
        ) : null}

        {groups.ended.length > 0 ? (
          <section aria-labelledby="ended-heading">
            <h2 id="ended-heading" className="mb-5 text-2xl font-black text-purple-950">
              Transmisiones finalizadas
            </h2>
            <div className="grid gap-6 lg:grid-cols-2">
              {groups.ended.map((stream) => (
                <StreamingCard key={stream.id} stream={stream} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PageContainer>
  );
}
