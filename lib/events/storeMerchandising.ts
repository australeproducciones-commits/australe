import type { Event } from "@/lib/events/types";

export type EventStoreMerchContext = {
  eventId: string;
  eventSlug: string;
  eventStatus: Event["status"];
  hasMerch: boolean;
  badgeText: string;
  showBlock: boolean;
};

export type EventStoreMerchBadge = {
  label: string;
  tone: "merch" | "primary";
};

export function getEventStoreMerchBadge(
  context: EventStoreMerchContext | null | undefined,
): EventStoreMerchBadge | null {
  if (!context?.hasMerch) {
    return null;
  }

  return {
    label: context.badgeText || "MERCH DISPONIBLE",
    tone: "merch",
  };
}

export const STORE_MERCH_BADGE_PRIORITY = 5;
