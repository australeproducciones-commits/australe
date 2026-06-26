import { randomBytes } from "crypto";

import { ROUTES } from "@/lib/constants/routes";
import type { InviteableEvent } from "@/lib/community/invitations/types";
import type { InvitationType } from "@/lib/community/invitations/types";

function normalizeWhatsapp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return null;
  }
  return digits.startsWith("54") ? digits : `54${digits}`;
}

export function buildInvitationTrackingUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return `${base}${ROUTES.invitacion(token)}`;
}

export function buildEventPublicUrl(event: Pick<InviteableEvent, "slug">): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return `${base}${ROUTES.evento(event.slug)}`;
}

export function buildInvitationMessage(params: {
  event: InviteableEvent;
  recipientName: string | null;
  customMessage?: string;
  invitationType: InvitationType;
  trackingUrl?: string;
}): string {
  const { event, recipientName, customMessage, invitationType, trackingUrl } =
    params;
  const greeting = recipientName ? `Hola ${recipientName}` : "Hola";
  const date = new Date(event.event_date).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const venue = event.location_name ? `\n📍 ${event.location_name}` : "";
  const link =
    invitationType === "purchase_link"
      ? trackingUrl ?? buildEventPublicUrl(event)
      : trackingUrl ?? buildEventPublicUrl(event);

  const lines = [
    `${greeting},`,
    "",
    customMessage?.trim() ||
      `Te invitamos a ${event.name} el ${date}.${venue}`,
    "",
    `Más info: ${link}`,
    "",
    "— Australe Producciones",
  ];

  return lines.join("\n");
}

export function buildWhatsappUrl(phone: string, message: string): string | null {
  const normalized = normalizeWhatsapp(phone);
  if (!normalized) {
    return null;
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildMailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function generateInvitationToken(): string {
  return randomBytes(24).toString("hex");
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/** Expiración predeterminada: 7 días desde creación, sin superar la fecha del evento si es anterior. */
export function computeInvitationExpiresAt(params: {
  eventDate: string;
  createdAt?: Date;
}): Date {
  const createdAt = params.createdAt ?? new Date();
  const defaultExpiry = new Date(createdAt.getTime() + SEVEN_DAYS_MS);
  const eventDate = new Date(params.eventDate);

  if (Number.isNaN(eventDate.getTime())) {
    return defaultExpiry;
  }

  return eventDate.getTime() < defaultExpiry.getTime() ? eventDate : defaultExpiry;
}

export function isInvitationExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) {
    return true;
  }
  return new Date(expiresAt).getTime() <= Date.now();
}
