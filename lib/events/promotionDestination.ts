import { isPromotionContent } from "@/lib/events/contentRules";
import type { Event } from "@/lib/events/types";

export type ResolvedPromotionDestination = {
  href: string;
  external: boolean;
  openInNewTab: boolean;
};

function getSiteHostname(): string | null {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://australeproducciones.com";

  try {
    return new URL(siteUrl).hostname;
  } catch {
    return null;
  }
}

export function isValidPromotionDestinationUrl(
  value: string | null | undefined,
): boolean {
  const destination = value?.trim();

  if (!destination) {
    return false;
  }

  const lower = destination.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return false;
  }

  if (destination.startsWith("/") && !destination.startsWith("//")) {
    return destination.length > 1;
  }

  if (destination.startsWith("//")) {
    return false;
  }

  try {
    const parsed = new URL(destination);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function resolvePromotionDestination(
  raw: string | null | undefined,
): ResolvedPromotionDestination | null {
  const trimmed = raw?.trim();
  if (!trimmed || !isValidPromotionDestinationUrl(trimmed)) {
    return null;
  }

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return { href: trimmed, external: false, openInNewTab: false };
  }

  try {
    const parsed = new URL(trimmed);
    const siteHost = getSiteHostname();

    if (siteHost && parsed.hostname === siteHost) {
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return {
        href: path || "/",
        external: false,
        openInNewTab: false,
      };
    }

    return {
      href: trimmed,
      external: true,
      openInNewTab: true,
    };
  } catch {
    return null;
  }
}

export function getPromotionDestination(
  event: Pick<Event, "content_kind" | "external_ticket_url">,
): ResolvedPromotionDestination | null {
  if (!isPromotionContent(event)) {
    return null;
  }

  return resolvePromotionDestination(event.external_ticket_url);
}
