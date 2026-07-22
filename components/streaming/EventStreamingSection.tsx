import Link from "next/link";
import { StreamingBadge } from "@/components/streaming/StreamingBadge";
import { StreamingCountdown } from "@/components/streaming/StreamingCountdown";
import { PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { formatStreamDateTime } from "@/lib/streaming/utils";
import {
  getStreamDisplayTitle,
  resolveStreamButtonLabel,
} from "@/lib/streaming/utils";
import type { EventStreamWithEvent } from "@/lib/streaming/types";
import { STREAM_STATUS } from "@/lib/streaming/types";

type EventStreamingSectionProps = {
  stream: EventStreamWithEvent;
};

export function EventStreamingSection({ stream }: EventStreamingSectionProps) {
  const title = getStreamDisplayTitle(stream, stream.event.name);
  const href = ROUTES.eventoEnVivo(stream.event.slug);
  const buttonLabel = resolveStreamButtonLabel(stream);
  const isLive = stream.status === STREAM_STATUS.LIVE;
  const isScheduled = stream.status === STREAM_STATUS.SCHEDULED;

  return (
    <PublicCard className="mt-8 border border-[var(--public-border)] bg-[var(--public-card)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--public-primary)]">
            {isScheduled ? "Próxima transmisión" : "Streaming"}
          </p>
          <h2 className="mt-2 text-xl font-black public-heading sm:text-2xl">{title}</h2>
          {stream.subtitle ? (
            <p className="mt-2 text-sm public-text-muted">{stream.subtitle}</p>
          ) : null}
        </div>
        <StreamingBadge status={stream.status} />
      </div>

      <div className="mt-4 space-y-4">
        <p className="text-sm public-text-muted">
          {formatStreamDateTime(stream.starts_at)}
        </p>

        {isScheduled && stream.starts_at ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--public-primary)]">
              Comienza en
            </p>
            <StreamingCountdown targetIso={stream.starts_at} />
          </div>
        ) : null}

        {isLive ? (
          <p className="text-sm font-medium text-red-700">
            La transmisión está en curso.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <PublicButton href={href} size="md">
            {isScheduled ? "Ver detalles" : buttonLabel}
          </PublicButton>
          <Link
            href={ROUTES.enVivo}
            className="inline-flex items-center text-sm font-semibold text-purple-700 underline-offset-2 hover:underline"
          >
            Ver portal En vivo
          </Link>
        </div>
      </div>
    </PublicCard>
  );
}
