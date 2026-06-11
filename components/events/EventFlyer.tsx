import { EventImage, type EventImageVariant } from "@/components/events/EventImage";
import type { Event } from "@/lib/events/types";
import { cn } from "@/lib/utils/cn";

type EventImagePurpose = "card" | "hero";

type EventFlyerProps = {
  event: Pick<
    Event,
    "name" | "main_image_url" | "thumbnail_url" | "flyer_url" | "banner_url"
  >;
  purpose?: EventImagePurpose;
  /** @deprecated Usar `purpose`. */
  variant?: EventImagePurpose;
  className?: string;
};

function purposeToVariant(purpose: EventImagePurpose): EventImageVariant {
  return purpose === "hero" ? "banner" : "card";
}

export function EventFlyer({
  event,
  purpose,
  variant = "card",
  className,
}: EventFlyerProps) {
  const resolvedPurpose = purpose ?? variant;
  const imageVariant = purposeToVariant(resolvedPurpose);

  return (
    <EventImage
      event={event}
      alt={
        resolvedPurpose === "hero"
          ? `Portada de ${event.name}`
          : `Flyer de ${event.name}`
      }
      variant={imageVariant}
      className={cn(
        resolvedPurpose === "hero" ? "min-h-[280px] sm:min-h-[360px]" : "",
        className,
      )}
    />
  );
}

type EventPosterProps = {
  event: Pick<
    Event,
    "name" | "main_image_url" | "thumbnail_url" | "flyer_url" | "banner_url"
  >;
  className?: string;
};

export function EventPoster({ event, className }: EventPosterProps) {
  if (event.main_image_url) {
    return null;
  }

  if (!event.flyer_url) {
    return null;
  }

  return (
    <div className={className}>
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-purple-300">
        Afiche del evento
      </p>
      <EventImage event={event} alt={`Afiche de ${event.name}`} variant="flyer" />
    </div>
  );
}
