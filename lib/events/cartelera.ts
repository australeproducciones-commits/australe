import type { Event } from "@/lib/events/types";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";
import { getMinPublicPrice } from "@/lib/tickets/utils";

export type CarteleraEvent = {
  event: Event;
  minPrice: number | null;
  featured: boolean;
};

export async function buildCarteleraEvents(
  events: Event[],
  featuredEventId?: string | null,
): Promise<CarteleraEvent[]> {
  const featuredId =
    featuredEventId ?? events.find((event) => event.is_featured)?.id ?? null;

  const sorted = [...events].sort((left, right) => {
    if (left.id === featuredId) {
      return -1;
    }
    if (right.id === featuredId) {
      return 1;
    }

    return left.event_date.localeCompare(right.event_date);
  });

  return Promise.all(
    sorted.map(async (event) => {
      const ticketTypes = await getActiveTicketTypesForPublishedEvent(
        event.id,
        event.status,
      );

      return {
        event,
        minPrice: getMinPublicPrice(ticketTypes),
        featured: event.id === featuredId,
      };
    }),
  );
}
