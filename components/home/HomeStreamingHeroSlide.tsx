"use client";

import Link from "next/link";
import { StreamingBadge } from "@/components/streaming/StreamingBadge";
import { StreamingBannerImage } from "@/components/streaming/StreamingBannerImage";
import { ROUTES } from "@/lib/constants/routes";
import { formatStreamDateTime } from "@/lib/streaming/utils";
import {
  getStreamDisplayTitle,
  resolveStreamButtonLabel,
} from "@/lib/streaming/utils";
import type { EventStreamWithEvent } from "@/lib/streaming/types";

type HomeStreamingHeroSlideProps = {
  stream: EventStreamWithEvent;
  priority?: boolean;
};

export function HomeStreamingHeroSlide({
  stream,
  priority = false,
}: HomeStreamingHeroSlideProps) {
  const title = getStreamDisplayTitle(stream, stream.event.name);
  const href = ROUTES.eventoEnVivo(stream.event.slug);
  const buttonLabel = resolveStreamButtonLabel(stream);
  const metaParts = [
    formatStreamDateTime(stream.starts_at),
    stream.event.location_name?.trim() || null,
  ].filter(Boolean);

  return (
    <article className="home-hero-slide-clean home-hero-slide-clean--has-meta">
      <div className="home-hero-banner-shell home-hero-banner-shell--streaming">
        <StreamingBannerImage
          stream={stream}
          event={stream.event}
          priority={priority}
          className="h-full w-full rounded-none"
        />
      </div>

      <div className="home-hero-meta-bar">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <div className="mb-1">
              <StreamingBadge status={stream.status} />
            </div>
            <p className="truncate text-sm font-bold sm:text-base">{title}</p>
            {metaParts.length > 0 ? (
              <p className="mt-0.5 text-xs text-[var(--public-text-secondary)] sm:text-sm">
                {metaParts.join(" · ")}
              </p>
            ) : null}
          </div>

          <Link
            href={href}
            className="public-btn-primary inline-flex w-full shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold sm:w-auto"
          >
            {buttonLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
