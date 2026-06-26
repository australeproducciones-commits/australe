import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  StreamingDetailView,
  StreamingUnavailableView,
} from "@/components/streaming/StreamingDetailView";
import { PageContainer, PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { getPublicStreamByEventSlug } from "@/lib/streaming/queries";

type EventoEnVivoPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EventoEnVivoPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  const stream = event ? await getPublicStreamByEventSlug(slug) : null;
  const title = stream?.title ?? event?.name ?? "Transmisión";
  return { title: `${title} · En vivo` };
}

export default async function EventoEnVivoPage({ params }: EventoEnVivoPageProps) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const stream = await getPublicStreamByEventSlug(slug);

  return (
    <PageContainer>
      <PublicButton href={ROUTES.eventos} variant="ghost" size="sm" className="mb-6">
        ← Volver a eventos
      </PublicButton>

      {stream ? (
        <StreamingDetailView stream={stream} />
      ) : (
        <StreamingUnavailableView eventName={event.name} eventSlug={event.slug} />
      )}
    </PageContainer>
  );
}
