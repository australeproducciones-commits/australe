import type { Event } from "@/lib/events/types";
import {
  getActiveTicketTypesForPublishedEvents,
} from "@/lib/tickets/queries";
import { getMinPublicPrice } from "@/lib/tickets/utils";
import { getMinCommunityPrice } from "@/lib/events/eventMerchandising";

export type CarteleraEvent = {
  event: Event;
  minPrice: number | null;
  minCommunityPrice: number | null;
  featured: boolean;
};

export async function buildCarteleraEvents(
  events: Event[],
  featuredEventId?: string | null,
): Promise<CarteleraEvent[]> {
  if (events.length === 0) {
    return [];
  }

  const featuredId =
    featuredEventId ?? events.find((event) => event.is_featured)?.id ?? null;

  const sorted = [...events].sort((left, right) => {
    if (left.id === featuredId) {
      return -1;
    }
    if (right.id === featuredId) {
      return 1;
    }

    return left.event_date?.localeCompare(right.event_date ?? "") ?? 0;
  });

  const ticketTypesByEvent = await getActiveTicketTypesForPublishedEvents(
    sorted.map((event) => event.id),
  );

  return sorted.map((event) => {
    const ticketTypes = ticketTypesByEvent.get(event.id) ?? [];

    return {
      event,
      minPrice: getMinPublicPrice(ticketTypes),
      minCommunityPrice: getMinCommunityPrice(ticketTypes),
      featured: event.id === featuredId,
    };
  });
}
