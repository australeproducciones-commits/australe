export const ANALYTICS_EVENT_NAMES = {
  PAGE_VIEW: "page_view",
  EVENT_VIEW: "event_view",
  TICKET_CLICK: "ticket_click",
  PURCHASE_STARTED: "purchase_started",
  PURCHASE_COMPLETED: "purchase_completed",
  RESERVATION_STARTED: "reservation_started",
  RESERVATION_COMPLETED: "reservation_completed",
  CONSUMPTION_VIEW: "consumption_view",
  CONSUMPTION_PURCHASE_STARTED: "consumption_purchase_started",
  CONSUMPTION_PURCHASE_COMPLETED: "consumption_purchase_completed",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENT_NAMES)[keyof typeof ANALYTICS_EVENT_NAMES];

export type AnalyticsTrackPayload = {
  event_name: AnalyticsEventName;
  page_path: string;
  event_id?: string | null;
  ticket_type_id?: string | null;
  session_id: string;
  visitor_id: string;
  referrer?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type AnalyticsEventRow = {
  id: string;
  event_name: string;
  page_path: string;
  event_id: string | null;
  ticket_type_id: string | null;
  session_id: string;
  visitor_id: string;
  referrer: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};
