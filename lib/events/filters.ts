import { EVENT_AUDIENCE } from "@/lib/constants/event-audience";
import { EVENT_CONTENT_KIND } from "@/lib/constants/event-content-kind";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import { appearsInEventListing, appearsInGalleriesIndex } from "@/lib/events/contentRules";
import { isEventFinished } from "@/lib/events/eventTiming";
import type { Event } from "@/lib/events/types";
import { isEventFeaturedActive } from "@/lib/events/utils";

export function filterCarteleraEvents(events: Event[], now = new Date()): Event[] {
  return events.filter(
    (event) =>
      appearsInEventListing(event) &&
      event.event_date &&
      !isEventFinished(event, now),
  );
}

export function filterFinishedGalleryEvents(events: Event[], now = new Date()): Event[] {
  return events
    .filter(
      (event) =>
        appearsInGalleriesIndex(event) &&
        event.status === EVENT_STATUS.PUBLISHED &&
        event.audience === EVENT_AUDIENCE.PUBLIC &&
        event.event_date &&
        isEventFinished(event, now),
    )
    .sort((left, right) => {
      const leftDate = left.event_end_date ?? left.event_date ?? "";
      const rightDate = right.event_end_date ?? right.event_date ?? "";
      return rightDate.localeCompare(leftDate);
    });
}

export function filterFeaturedHomeContent(events: Event[]): Event[] {
  return events
    .filter(isEventFeaturedActive)
    .filter(
      (event) =>
        event.content_kind === EVENT_CONTENT_KIND.PROMOTION ||
        (appearsInEventListing(event) && Boolean(event.event_date)),
    )
    .sort((left, right) => {
      const order = left.home_order - right.home_order;
      if (order !== 0) return order;
      const leftDate = left.event_date ?? "9999-12-31";
      const rightDate = right.event_date ?? "9999-12-31";
      const date = leftDate.localeCompare(rightDate);
      if (date !== 0) return date;
      return (left.start_time ?? "").localeCompare(right.start_time ?? "");
    });
}
