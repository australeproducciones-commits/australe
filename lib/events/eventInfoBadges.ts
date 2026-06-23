import type { EventInfoBadgeTone } from "@/components/events/EventInfoBadge";
import {
  getEventMerchandisingBadges,
  type EventMerchandisingBadge,
  type EventMerchandisingContext,
} from "@/lib/events/eventMerchandising";
import type { Event } from "@/lib/events/types";
import {
  computeDurationMinutes,
  formatDurationLabel,
} from "@/lib/events/eventSchedule";
import {
  resolveSaleChannels,
  getValidExternalTicketUrl,
} from "@/lib/events/saleChannels";
import {
  formatEventDateCompact,
  formatTime,
  isEventFeaturedActive,
} from "@/lib/events/utils";
import { formatTicketPrice } from "@/lib/tickets/utils";

function mapMerchandisingTone(
  tone: EventMerchandisingBadge["tone"],
): EventInfoBadgeItem["tone"] {
  switch (tone) {
    case "community":
      return "community";
    case "warning":
      return "warning";
    case "success":
      return "success";
    case "primary":
      return "primary";
    default:
      return "neutral";
  }
}

export type EventInfoBadgeItem = {
  key: string;
  label: string;
  tone?: EventInfoBadgeTone;
  icon?: "calendar" | "clock" | "duration" | "location" | "price" | "star";
};

type BuildHeroBadgesInput = {
  event: Event;
  minPrice?: number | null;
  minCommunityPrice?: number | null;
  merchandising?: EventMerchandisingContext;
  kioskPresaleEnabled?: boolean;
};

export function buildEventHeroBadges({
  event,
  minPrice = null,
  minCommunityPrice = null,
  merchandising,
  kioskPresaleEnabled = false,
}: BuildHeroBadgesInput): EventInfoBadgeItem[] {
  const badges: EventInfoBadgeItem[] = [];

  badges.push({
    key: "date",
    label: formatEventDateCompact(event.event_date),
    icon: "calendar",
  });

  const startTime = formatTime(event.start_time);
  if (startTime) {
    badges.push({
      key: "time",
      label: startTime,
      icon: "clock",
    });
  }

  if (event.start_time && event.end_time) {
    const duration = computeDurationMinutes(event.start_time, event.end_time);
    if (duration != null && duration > 0) {
      badges.push({
        key: "duration",
        label: formatDurationLabel(duration),
        icon: "duration",
      });
    }
  }

  if (event.location_name) {
    badges.push({
      key: "location",
      label: event.location_name,
      icon: "location",
    });
  }

  if (minPrice != null) {
    badges.push({
      key: "price",
      label: `Desde ${formatTicketPrice(minPrice)}`,
      tone: "primary",
      icon: "price",
    });
  }

  if (minCommunityPrice != null) {
    badges.push({
      key: "community-price",
      label: `Comunidad ${formatTicketPrice(minCommunityPrice)}`,
      tone: "community",
    });
  }

  if (isEventFeaturedActive(event)) {
    badges.push({
      key: "featured",
      label: "Evento destacado",
      tone: "featured",
      icon: "star",
    });
  }

  const channels = resolveSaleChannels(event);
  const externalUrl = getValidExternalTicketUrl(event);

  if (kioskPresaleEnabled) {
    badges.push({
      key: "kiosk-presale",
      label: "Preventa consumiciones",
      tone: "primary",
    });
  }

  if (channels.externalSaleEnabled && externalUrl) {
    badges.push({
      key: "external-sale",
      label: "Venta externa",
      tone: "default",
    });
  }

  const merchandisingBadges = getEventMerchandisingBadges(
    merchandising ?? {
      event,
      ticketTypes: [],
      minCommunityPrice,
      kioskPresaleEnabled,
    },
  );

  for (const badge of merchandisingBadges) {
    if (
      badge.label === "Preventa de consumiciones" ||
      badge.label === "Venta en sitio externo" ||
      badge.label === "Precio especial comunidad"
    ) {
      continue;
    }

    badges.push({
      key: `merch-${badge.label}`,
      label: badge.label,
      tone: mapMerchandisingTone(badge.tone),
    });
  }

  return badges;
}

type BuildCardBadgesInput = {
  event: Event;
  minPrice?: number | null;
  featured?: boolean;
};

export function buildEventCardBadges({
  event,
  minPrice = null,
  featured = false,
}: BuildCardBadgesInput): EventInfoBadgeItem[] {
  const badges: EventInfoBadgeItem[] = [];

  badges.push({
    key: "date",
    label: formatEventDateCompact(event.event_date),
    icon: "calendar",
  });

  const startTime = formatTime(event.start_time);
  if (startTime) {
    badges.push({
      key: "time",
      label: startTime,
      icon: "clock",
    });
  }

  if (minPrice != null) {
    badges.push({
      key: "price",
      label: `Desde ${formatTicketPrice(minPrice)}`,
      tone: "primary",
    });
  }

  if (featured) {
    badges.push({
      key: "featured",
      label: "Destacado",
      tone: "featured",
    });
  }

  const channels = resolveSaleChannels(event);
  const externalUrl = getValidExternalTicketUrl(event);

  if (channels.externalSaleEnabled && externalUrl) {
    badges.push({
      key: "external-sale",
      label: "Venta externa",
    });
  }

  if (channels.reservationEnabled) {
    badges.push({
      key: "reservation",
      label: "Reserva",
      tone: "default",
    });
  }

  return badges;
}
