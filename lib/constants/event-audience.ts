export const EVENT_AUDIENCE = {
  PUBLIC: "public",
  COMMUNITY: "community",
} as const;

export type EventAudience =
  (typeof EVENT_AUDIENCE)[keyof typeof EVENT_AUDIENCE];

export const EVENT_AUDIENCE_VALUES = Object.values(EVENT_AUDIENCE);

export const EVENT_AUDIENCE_LABELS: Record<EventAudience, string> = {
  [EVENT_AUDIENCE.PUBLIC]: "Público",
  [EVENT_AUDIENCE.COMMUNITY]: "Solo comunidad",
};

export const FINANCIAL_MANAGEMENT_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
} as const;

export type FinancialManagementStatus =
  (typeof FINANCIAL_MANAGEMENT_STATUS)[keyof typeof FINANCIAL_MANAGEMENT_STATUS];
