"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/client";
import { ANALYTICS_EVENT_NAMES } from "@/lib/analytics/types";

type PublicAnalyticsTrackerProps = {
  eventId?: string | null;
  eventSlug?: string | null;
};

export function PublicAnalyticsTracker({
  eventId = null,
}: PublicAnalyticsTrackerProps) {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) {
      return;
    }
    lastPath.current = pathname;

    const isEventPage = /^\/eventos\/[^/]+$/.test(pathname);
    const isEventList = pathname === "/eventos";
    const isHome = pathname === "/";

    if (isEventPage && eventId) {
      void trackAnalyticsEvent(ANALYTICS_EVENT_NAMES.EVENT_VIEW, {
        pagePath: pathname,
        eventId,
      });
      return;
    }

    if (isHome || isEventList || pathname.startsWith("/eventos/")) {
      void trackAnalyticsEvent(ANALYTICS_EVENT_NAMES.PAGE_VIEW, {
        pagePath: pathname,
        eventId,
      });
    }
  }, [pathname, eventId]);

  return null;
}
