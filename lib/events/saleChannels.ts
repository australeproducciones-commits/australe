import {
  TICKET_SALE_MODE,
  type TicketSaleMode,
} from "@/lib/constants/event-status";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { Event, EventFormInput } from "@/lib/events/types";

export type EventSaleChannelFields = Pick<
  Event,
  | "sale_web_enabled"
  | "external_sale_enabled"
  | "sale_whatsapp_enabled"
  | "reservation_enabled"
  | "external_ticket_url"
  | "whatsapp_sale_number"
  | "whatsapp_sale_message"
  | "ticket_sale_mode"
>;

export type ResolvedSaleChannels = {
  saleWebEnabled: boolean;
  externalSaleEnabled: boolean;
  saleWhatsappEnabled: boolean;
  reservationEnabled: boolean;
  externalTicketUrl: string | null;
  whatsappSaleNumber: string | null;
  whatsappSaleMessage: string | null;
};

const SALE_CHANNEL_LABELS = {
  web: "Venta web",
  external: "Link externo",
  whatsapp: "WhatsApp",
  reservation: "Reserva",
} as const;

export function resolveSaleChannels(
  event: Partial<EventSaleChannelFields>,
): ResolvedSaleChannels {
  const hasNewFields =
    event.sale_web_enabled != null ||
    event.external_sale_enabled != null ||
    event.reservation_enabled != null;

  if (hasNewFields) {
    return {
      saleWebEnabled: event.sale_web_enabled ?? false,
      externalSaleEnabled: event.external_sale_enabled ?? false,
      saleWhatsappEnabled: event.sale_whatsapp_enabled ?? false,
      reservationEnabled: event.reservation_enabled ?? false,
      externalTicketUrl: event.external_ticket_url?.trim() || null,
      whatsappSaleNumber: event.whatsapp_sale_number?.trim() || null,
      whatsappSaleMessage: event.whatsapp_sale_message?.trim() || null,
    };
  }

  const mode = event.ticket_sale_mode ?? TICKET_SALE_MODE.INTERNAL;
  return {
    saleWebEnabled:
      mode === TICKET_SALE_MODE.INTERNAL || mode === TICKET_SALE_MODE.BOTH,
    externalSaleEnabled:
      mode === TICKET_SALE_MODE.EXTERNAL || mode === TICKET_SALE_MODE.BOTH,
    saleWhatsappEnabled: false,
    reservationEnabled:
      mode === TICKET_SALE_MODE.INTERNAL || mode === TICKET_SALE_MODE.BOTH,
    externalTicketUrl: event.external_ticket_url?.trim() || null,
    whatsappSaleNumber: null,
    whatsappSaleMessage: null,
  };
}

export function hasAnySaleChannel(
  input: Pick<
    EventFormInput,
    | "sale_web_enabled"
    | "external_sale_enabled"
    | "sale_whatsapp_enabled"
    | "reservation_enabled"
  >,
): boolean {
  return (
    input.sale_web_enabled ||
    input.external_sale_enabled ||
    input.sale_whatsapp_enabled ||
    input.reservation_enabled
  );
}

export function isWebOrReservationEnabled(
  event: Partial<EventSaleChannelFields>,
): boolean {
  const channels = resolveSaleChannels(event);
  return channels.saleWebEnabled || channels.reservationEnabled;
}

export function isValidExternalTicketUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function getValidExternalTicketUrl(
  event: Partial<EventSaleChannelFields>,
): string | null {
  const channels = resolveSaleChannels(event);
  if (!channels.externalSaleEnabled) {
    return null;
  }

  const url = channels.externalTicketUrl;
  if (!url || !isValidExternalTicketUrl(url)) {
    return null;
  }

  return url;
}

export function sanitizeWhatsAppNumber(number: string): string {
  return number.replace(/\D/g, "");
}

export function isValidWhatsAppNumber(number: string): boolean {
  const digits = sanitizeWhatsAppNumber(number);
  return digits.length >= 10 && digits.length <= 15;
}

export function buildWhatsAppSaleUrl(
  number: string,
  message: string,
): string | null {
  const digits = sanitizeWhatsAppNumber(number);
  if (!isValidWhatsAppNumber(number)) {
    return null;
  }

  const params = new URLSearchParams();
  const trimmedMessage = message.trim();
  if (trimmedMessage) {
    params.set("text", trimmedMessage);
  }

  const query = params.toString();
  return query
    ? `https://wa.me/${digits}?${query}`
    : `https://wa.me/${digits}`;
}

export function getWhatsAppSaleUrl(
  event: Partial<EventSaleChannelFields>,
): string | null {
  const channels = resolveSaleChannels(event);
  if (!channels.saleWhatsappEnabled || !channels.whatsappSaleNumber) {
    return null;
  }

  return buildWhatsAppSaleUrl(
    channels.whatsappSaleNumber,
    channels.whatsappSaleMessage ?? "",
  );
}

export function deriveTicketSaleMode(
  input: Pick<
    EventFormInput,
    | "sale_web_enabled"
    | "external_sale_enabled"
    | "sale_whatsapp_enabled"
    | "reservation_enabled"
  >,
): TicketSaleMode {
  if (!hasAnySaleChannel(input)) {
    return TICKET_SALE_MODE.DISABLED;
  }

  const hasInternalFlow = input.sale_web_enabled || input.reservation_enabled;

  if (input.external_sale_enabled && !hasInternalFlow) {
    return TICKET_SALE_MODE.EXTERNAL;
  }

  if (input.external_sale_enabled && hasInternalFlow) {
    return TICKET_SALE_MODE.BOTH;
  }

  return TICKET_SALE_MODE.INTERNAL;
}

export function formatSaleChannelsSummary(
  event: Partial<EventSaleChannelFields>,
): string {
  const channels = resolveSaleChannels(event);
  const labels: string[] = [];

  if (channels.saleWebEnabled) {
    labels.push(SALE_CHANNEL_LABELS.web);
  }
  if (channels.externalSaleEnabled) {
    labels.push(SALE_CHANNEL_LABELS.external);
  }
  if (channels.saleWhatsappEnabled) {
    labels.push(SALE_CHANNEL_LABELS.whatsapp);
  }
  if (channels.reservationEnabled) {
    labels.push(SALE_CHANNEL_LABELS.reservation);
  }

  if (labels.length === 0) {
    return "Sin canales";
  }

  return labels.join(" · ");
}

export function isPublishingStatus(status: string): boolean {
  return (
    status === EVENT_STATUS.PUBLISHED || status === EVENT_STATUS.SOLD_OUT
  );
}

export function countEnabledPublicChannels(
  event: Partial<EventSaleChannelFields>,
  options?: {
    hasTicketTypes?: boolean;
    externalUrlValid?: boolean;
    whatsappUrlValid?: boolean;
  },
): number {
  const channels = resolveSaleChannels(event);
  let count = 0;

  if (
    channels.saleWebEnabled &&
    (options?.hasTicketTypes ?? true)
  ) {
    count += 1;
  }

  if (
    channels.externalSaleEnabled &&
    (options?.externalUrlValid ??
      Boolean(getValidExternalTicketUrl(event)))
  ) {
    count += 1;
  }

  if (
    channels.saleWhatsappEnabled &&
    (options?.whatsappUrlValid ?? Boolean(getWhatsAppSaleUrl(event)))
  ) {
    count += 1;
  }

  if (
    channels.reservationEnabled &&
    (options?.hasTicketTypes ?? true)
  ) {
    count += 1;
  }

  return count;
}
