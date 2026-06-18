"use client";

import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/types";

type EventPageAnalyticsProps = {
  eventId: string;
  slug: string;
};

export function EventPageAnalytics({ eventId, slug }: EventPageAnalyticsProps) {
  useEffect(() => {
    void trackAnalyticsEvent(ANALYTICS_EVENT_NAMES.EVENT_VIEW, {
      pagePath: `/eventos/${slug}`,
      eventId,
    });
  }, [eventId, slug]);

  return null;
}
