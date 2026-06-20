/** Imagen por defecto cuando el evento no tiene ninguna URL cargada. */
export const DEFAULT_EVENT_IMAGE = "/images/australe.png";

export type EventImageFields = {
  banner_url?: string | null;
  main_image_url?: string | null;
  thumbnail_url?: string | null;
  flyer_url?: string | null;
};

/** URL real cargada por el evento, sin fallback. */
export function getEventImageSource(event: EventImageFields): string | null {
  const banner = event.banner_url?.trim();
  if (banner) {
    return banner;
  }

  const main = event.main_image_url?.trim();
  if (main) {
    return main;
  }

  const thumbnail = event.thumbnail_url?.trim();
  if (thumbnail) {
    return thumbnail;
  }

  const flyer = event.flyer_url?.trim();
  if (flyer) {
    return flyer;
  }

  return null;
}

export function hasCustomEventImage(event: EventImageFields): boolean {
  return getEventImageSource(event) !== null;
}

/** Prioridad unificada: banner → main → thumbnail → flyer → default. */
export function getEventImage(event: EventImageFields): string {
  return getEventImageSource(event) ?? DEFAULT_EVENT_IMAGE;
}
