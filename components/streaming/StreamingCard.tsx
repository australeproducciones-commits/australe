import Link from "next/link";
import { StreamingBadge } from "@/components/streaming/StreamingBadge";
import { StreamingBannerImage } from "@/components/streaming/StreamingBannerImage";
import { StreamingCountdown } from "@/components/streaming/StreamingCountdown";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { ROUTES } from "@/lib/constants/routes";
import { formatStreamDateTime } from "@/lib/streaming/utils";
import {
  getStreamDisplayTitle,
  resolveStreamButtonLabel,
  shouldShowCountdown,
} from "@/lib/streaming/utils";
import type { EventStreamWithEvent } from "@/lib/streaming/types";
import { STREAM_PROVIDER_LABELS } from "@/lib/streaming/types";
import { cn } from "@/lib/utils/cn";

type StreamingCardProps = {
  stream: EventStreamWithEvent;
  className?: string;
};

export function StreamingCard({ stream, className }: StreamingCardProps) {
  const title = getStreamDisplayTitle(stream, stream.event.name);
  const href = ROUTES.eventoEnVivo(stream.event.slug);
  const buttonLabel = resolveStreamButtonLabel(stream);

  return (
    <article
      className={cn(
        "public-card overflow-hidden rounded-3xl border border-purple-100/80 bg-white shadow-sm",
        className,
      )}
    >
      <StreamingBannerImage
        stream={stream}
        event={stream.event}
        className="aspect-[12/5] max-h-56 sm:max-h-64"
        overlay={
          <div className="space-y-3 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <StreamingBadge status={stream.status} />
              <span className="text-xs font-medium uppercase tracking-wide text-white/80">
                {STREAM_PROVIDER_LABELS[stream.provider]}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
                {stream.event.name}
              </p>
              <h3 className="mt-1 text-xl font-black sm:text-2xl">{title}</h3>
              {stream.subtitle ? (
                <p className="mt-1 text-sm text-white/85">{stream.subtitle}</p>
              ) : null}
            </div>
          </div>
        }
      />

      <div className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm public-text-muted">
          <p>{formatStreamDateTime(stream.starts_at)}</p>
          {stream.event.location_name ? <p>{stream.event.location_name}</p> : null}
        </div>

        {shouldShowCountdown(stream.status) && stream.starts_at ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-700">
              Comienza en
            </p>
            <StreamingCountdown targetIso={stream.starts_at} />
          </div>
        ) : null}

        <PublicButton href={href} size="md" className="w-full sm:w-auto">
          {buttonLabel}
        </PublicButton>
      </div>
    </article>
  );
}

export function StreamingHero({
  stream,
  className,
}: {
  stream: EventStreamWithEvent;
  className?: string;
}) {
  const title = getStreamDisplayTitle(stream, stream.event.name);
  const href = ROUTES.eventoEnVivo(stream.event.slug);
  const buttonLabel = resolveStreamButtonLabel(stream);

  return (
    <section className={cn("overflow-hidden", className)}>
      <StreamingBannerImage
        stream={stream}
        event={stream.event}
        priority
        className="aspect-[12/5] min-h-[280px] sm:min-h-[360px]"
        overlay={
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StreamingBadge status={stream.status} />
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {stream.status === "scheduled" ? "Próxima transmisión" : "Transmisión"}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/80">
                {stream.event.name}
              </p>
              <h1 className="mt-2 text-3xl font-black sm:text-5xl">{title}</h1>
              {stream.subtitle ? (
                <p className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg">
                  {stream.subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {shouldShowCountdown(stream.status) && stream.starts_at ? (
                <StreamingCountdown targetIso={stream.starts_at} />
              ) : (
                <p className="text-sm font-medium text-white/90">
                  {formatStreamDateTime(stream.starts_at)}
                </p>
              )}
              <PublicButton href={href} size="lg">
                {buttonLabel}
              </PublicButton>
            </div>
          </div>
        }
      />
    </section>
  );
}

export function StreamingEmptyState() {
  return (
    <div className="public-card mx-auto max-w-2xl rounded-3xl px-8 py-12 text-center">
      <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
        Streaming
      </p>
      <h1 className="public-heading mt-4 text-3xl font-black sm:text-4xl">
        En vivo
      </h1>
      <p className="mt-4 text-base leading-relaxed public-text-muted">
        No hay transmisiones programadas en este momento.
      </p>
      <Link
        href={ROUTES.eventos}
        className="public-btn-primary mt-8 inline-flex rounded-2xl px-8 py-4 text-sm font-semibold"
      >
        Ver cartelera de eventos
      </Link>
    </div>
  );
}
