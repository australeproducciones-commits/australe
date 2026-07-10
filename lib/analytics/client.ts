"use client";

import type { AnalyticsEventName, AnalyticsTrackPayload } from "@/lib/analytics/types";

const VISITOR_COOKIE = "ap_visitor";
const SESSION_COOKIE = "ap_session";
const DEDUPE_MS = 30 * 60 * 1000;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function randomId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getAnalyticsIds(): { visitorId: string; sessionId: string } {
  let visitorId = readCookie(VISITOR_COOKIE);
  if (!visitorId) {
    visitorId = randomId();
    writeCookie(VISITOR_COOKIE, visitorId, 60 * 60 * 24 * 365);
  }

  let sessionId = readCookie(SESSION_COOKIE);
  if (!sessionId) {
    sessionId = randomId();
  }
  writeCookie(SESSION_COOKIE, sessionId, 60 * 30);

  return { visitorId, sessionId };
}

function shouldSkipDuplicatePageView(pagePath: string): boolean {
  try {
    const key = `ap_pv:${pagePath}`;
    const last = sessionStorage.getItem(key);
    if (last && Date.now() - Number(last) < DEDUPE_MS) {
      return true;
    }
    sessionStorage.setItem(key, String(Date.now()));
    return false;
  } catch {
    return false;
  }
}

const ANALYTICS_TIMEOUT_MS = 3_000;

export async function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  options: {
    pagePath?: string;
    eventId?: string | null;
    ticketTypeId?: string | null;
    metadata?: Record<string, string | number | boolean | null>;
    skipPageViewDedupe?: boolean;
  } = {},
): Promise<void> {
  const pagePath =
    options.pagePath ??
    (typeof window !== "undefined" ? window.location.pathname : "/");

  if (
    eventName === "page_view" &&
    !options.skipPageViewDedupe &&
    shouldSkipDuplicatePageView(pagePath)
  ) {
    return;
  }

  const { visitorId, sessionId } = getAnalyticsIds();

  const payload: AnalyticsTrackPayload = {
    event_name: eventName,
    page_path: pagePath,
    event_id: options.eventId ?? null,
    ticket_type_id: options.ticketTypeId ?? null,
    session_id: sessionId,
    visitor_id: visitorId,
    referrer: typeof document !== "undefined" ? document.referrer || null : null,
    metadata: options.metadata,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYTICS_TIMEOUT_MS);

    await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
  } catch {
    // Analítica no debe bloquear la experiencia del usuario.
  }
}
