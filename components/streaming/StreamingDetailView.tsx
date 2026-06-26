import type { EventStreamWithEvent } from "@/lib/streaming/types";
import { STREAM_STATUS } from "@/lib/streaming/types";
import { StreamingPlayer } from "@/components/streaming/StreamingPlayer";
import { StreamingBannerImage } from "@/components/streaming/StreamingBannerImage";
import { StreamingBadge } from "@/components/streaming/StreamingBadge";
import { StreamingCountdown } from "@/components/streaming/StreamingCountdown";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { ROUTES } from "@/lib/constants/routes";
import { formatStreamDateTime } from "@/lib/streaming/utils";
import {
  getStreamDisplayTitle,
  resolveStreamButtonLabel,
  shouldShowCountdown,
  shouldShowPlayer,
} from "@/lib/streaming/utils";

type StreamingDetailViewProps = {
  stream: EventStreamWithEvent;
};

export function StreamingDetailView({ stream }: StreamingDetailViewProps) {
  const title = getStreamDisplayTitle(stream, stream.event.name);

  return (
    <div className="space-y-8">
      <StreamingBannerImage
        stream={stream}
        event={stream.event}
        priority
        className="aspect-[12/5] min-h-[240px] sm:min-h-[320px]"
        overlay={
          <div className="space-y-3 text-white">
            <StreamingBadge status={stream.status} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
              {stream.event.name}
            </p>
            <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
            {stream.subtitle ? (
              <p className="max-w-2xl text-sm text-white/90 sm:text-base">{stream.subtitle}</p>
            ) : null}
          </div>
        }
      />

      <div className="public-card rounded-3xl p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm public-text-muted">
              {formatStreamDateTime(stream.starts_at)}
            </p>
            {stream.event.location_name ? (
              <p className="mt-1 text-sm public-text-muted">{stream.event.location_name}</p>
            ) : null}
          </div>
          <PublicButton href={ROUTES.evento(stream.event.slug)} variant="ghost" size="sm">
            ← Volver al evento
          </PublicButton>
        </div>

        {stream.status === STREAM_STATUS.PAUSED ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-900">
            La transmisión se encuentra momentáneamente pausada.
          </p>
        ) : null}

        {stream.status === STREAM_STATUS.ENDED ? (
          <p className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm font-medium text-zinc-700">
            Esta transmisión ha finalizado. La repetición estará disponible en una etapa futura.
          </p>
        ) : null}

        {shouldShowCountdown(stream.status) && stream.starts_at ? (
          <div className="mt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-purple-700">
              Comienza en
            </p>
            <StreamingCountdown targetIso={stream.starts_at} />
          </div>
        ) : null}

        {shouldShowPlayer(stream.status) ? (
          <div className="mt-8">
            <StreamingPlayer
              streamUrl={stream.stream_url}
              provider={stream.provider}
              title={title}
              linkLabel={resolveStreamButtonLabel(stream)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StreamingUnavailableView({
  eventName,
  eventSlug,
}: {
  eventName: string;
  eventSlug: string;
}) {
  return (
    <div className="public-card mx-auto max-w-2xl rounded-3xl px-8 py-12 text-center">
      <h1 className="public-heading text-3xl font-black">{eventName}</h1>
      <p className="mt-4 public-text-muted">
        Este evento no tiene una transmisión pública disponible en este momento.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <PublicButton href={ROUTES.evento(eventSlug)}>Volver al evento</PublicButton>
        <PublicButton href={ROUTES.enVivo} variant="ghost">
          Ver portal En vivo
        </PublicButton>
      </div>
    </div>
  );
}
