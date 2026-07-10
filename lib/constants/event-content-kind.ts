export const EVENT_CONTENT_KIND = {
  EVENT: "event",
  PROMOTION: "promotion",
} as const;

export type EventContentKind =
  (typeof EVENT_CONTENT_KIND)[keyof typeof EVENT_CONTENT_KIND];

export const EVENT_CONTENT_KIND_VALUES: EventContentKind[] = [
  EVENT_CONTENT_KIND.EVENT,
  EVENT_CONTENT_KIND.PROMOTION,
];

export const EVENT_CONTENT_KIND_LABELS: Record<EventContentKind, string> = {
  event: "Evento",
  promotion: "Promoción (hero)",
};
