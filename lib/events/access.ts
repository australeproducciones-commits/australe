import { EVENT_AUDIENCE, EVENT_AUDIENCE_LABELS, type EventAudience } from "@/lib/constants/event-audience";
import { EVENT_STATUS, EVENT_STATUS_LABELS } from "@/lib/constants/event-status";
import { isActiveCommunityMember } from "@/lib/community/membership";
import type { Event } from "@/lib/events/types";

export type EventPublicAccess = "full" | "community_gate" | "not_found";

export function getEventAudience(event: Pick<Event, "audience">): EventAudience {
  const value = event.audience;
  if (value === EVENT_AUDIENCE.COMMUNITY) {
    return EVENT_AUDIENCE.COMMUNITY;
  }
  return EVENT_AUDIENCE.PUBLIC;
}

export function isEventPublished(
  event: Pick<Event, "status">,
): boolean {
  return event.status === EVENT_STATUS.PUBLISHED;
}

export function isEventPubliclyListed(
  event: Pick<Event, "status" | "audience">,
): boolean {
  return (
    isEventPublished(event) &&
    getEventAudience(event) === EVENT_AUDIENCE.PUBLIC
  );
}

export function isCommunityOnlyEvent(
  event: Pick<Event, "status" | "audience">,
): boolean {
  return (
    isEventPublished(event) &&
    getEventAudience(event) === EVENT_AUDIENCE.COMMUNITY
  );
}

export function getEventVisibilityBadge(
  event: Pick<Event, "status" | "audience">,
): string {
  if (event.status === EVENT_STATUS.DRAFT) {
    return "Borrador";
  }
  if (event.status === EVENT_STATUS.HIDDEN) {
    return "Privado";
  }
  if (getEventAudience(event) === EVENT_AUDIENCE.COMMUNITY) {
    return "Solo comunidad";
  }
  if (event.status === EVENT_STATUS.PUBLISHED) {
    return EVENT_AUDIENCE_LABELS[getEventAudience(event)];
  }

  return EVENT_STATUS_LABELS[event.status as keyof typeof EVENT_STATUS_LABELS] ?? event.status;
}

export async function resolveEventPublicAccess(
  event: Pick<Event, "status" | "audience">,
  profileId: string | null | undefined,
): Promise<EventPublicAccess> {
  if (!isEventPublished(event)) {
    return "not_found";
  }

  if (getEventAudience(event) === EVENT_AUDIENCE.PUBLIC) {
    return "full";
  }

  const isMember = await isActiveCommunityMember(profileId);
  return isMember ? "full" : "community_gate";
}
