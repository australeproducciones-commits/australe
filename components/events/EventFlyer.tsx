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
  priority?: boolean;
};

function purposeToVariant(purpose: EventImagePurpose): EventImageVariant {
  return purpose === "hero" ? "banner" : "card";
}

export function EventFlyer({
  event,
  purpose,
  variant = "card",
  className,
  priority = false,
}: EventFlyerProps) {
  const resolvedPurpose = purpose ?? variant;
  const imageVariant = purposeToVariant(resolvedPurpose);

  return (
    <EventImage
      event={event}
      alt={`Banner del evento ${event.name}`}
      variant={imageVariant}
      priority={priority}
      className={cn(
        resolvedPurpose === "hero" ? "min-h-[200px] sm:min-h-[280px]" : "",
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

/** @deprecated El banner unificado reemplaza el afiche separado en el detalle. */
export function EventPoster(props: EventPosterProps) {
  void props;
  return null;
}
