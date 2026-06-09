import type { Event } from "@/lib/events/types";
import {
  getEventCardImageUrl,
  getEventDetailPosterUrl,
  getEventHeroImageUrl,
} from "@/lib/events/utils";
import { cn } from "@/lib/utils/cn";

type EventImagePurpose = "card" | "hero";

type EventFlyerProps = {
  event: Pick<Event, "name" | "flyer_url" | "banner_url">;
  purpose?: EventImagePurpose;
  /** @deprecated Usar `purpose`. */
  variant?: EventImagePurpose;
  className?: string;
};

function resolveImageUrl(
  event: Pick<Event, "flyer_url" | "banner_url">,
  purpose: EventImagePurpose,
): string | null {
  return purpose === "hero"
    ? getEventHeroImageUrl(event)
    : getEventCardImageUrl(event);
}

function placeholderLabel(purpose: EventImagePurpose): string {
  return purpose === "hero" ? "Portada próximamente" : "Afiche próximamente";
}

export function EventFlyer({
  event,
  purpose,
  variant = "card",
  className,
}: EventFlyerProps) {
  const resolvedPurpose = purpose ?? variant;
  const imageUrl = resolveImageUrl(event, resolvedPurpose);
  const isHero = resolvedPurpose === "hero";

  const heightClass = isHero
    ? "min-h-[280px] sm:min-h-[360px]"
    : "h-40 sm:h-48";

  if (imageUrl) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900",
          heightClass,
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={
            isHero
              ? `Portada de ${event.name}`
              : `Flyer de ${event.name}`
          }
          className={cn(
            "h-full w-full",
            isHero ? "object-cover" : "object-contain",
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 via-purple-950/40 to-zinc-900 px-4 text-center",
        heightClass,
        className,
      )}
    >
      <span className="text-2xl opacity-40">✦</span>
      <span className="text-sm text-zinc-500">
        {placeholderLabel(resolvedPurpose)}
      </span>
    </div>
  );
}

type EventPosterProps = {
  event: Pick<Event, "name" | "flyer_url" | "banner_url">;
  className?: string;
};

export function EventPoster({ event, className }: EventPosterProps) {
  const posterUrl = getEventDetailPosterUrl(event);

  if (!posterUrl) {
    return null;
  }

  return (
    <div className={className}>
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-purple-300">
        Afiche oficial
      </p>
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl}
          alt={`Afiche de ${event.name}`}
          className="mx-auto max-h-[520px] w-full object-contain"
        />
      </div>
    </div>
  );
}
