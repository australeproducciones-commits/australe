import { EVENT_CONTENT_KIND, type EventContentKind } from "@/lib/constants/event-content-kind";
import type { Event } from "@/lib/events/types";

export function getEventContentKind(
  event: Pick<Event, "content_kind">,
): EventContentKind {
  return event.content_kind ?? EVENT_CONTENT_KIND.EVENT;
}

export function isEventContent(event: Pick<Event, "content_kind">): boolean {
  return getEventContentKind(event) === EVENT_CONTENT_KIND.EVENT;
}

export function isPromotionContent(event: Pick<Event, "content_kind">): boolean {
  return getEventContentKind(event) === EVENT_CONTENT_KIND.PROMOTION;
}

export function canHaveTicketSales(event: Pick<Event, "content_kind">): boolean {
  return isEventContent(event);
}

export function canHaveStreaming(event: Pick<Event, "content_kind">): boolean {
  return isEventContent(event);
}

export function canHaveGallery(event: Pick<Event, "content_kind">): boolean {
  return isEventContent(event);
}

export function appearsInEventListing(event: Pick<Event, "content_kind">): boolean {
  return isEventContent(event);
}

export function appearsInGalleriesIndex(event: Pick<Event, "content_kind">): boolean {
  return isEventContent(event);
}
