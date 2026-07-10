import {
  EVENT_AUDIENCE,
  EVENT_AUDIENCE_VALUES,
  FINANCIAL_MANAGEMENT_STATUS,
  type EventAudience,
} from "@/lib/constants/event-audience";
import {
  EVENT_STATUS_VALUES,
  type EventStatus,
  type TicketSaleMode,
} from "@/lib/constants/event-status";
import {
  EVENT_CONTENT_KIND,
  EVENT_CONTENT_KIND_VALUES,
  type EventContentKind,
} from "@/lib/constants/event-content-kind";
import { isPromotionContent } from "@/lib/events/contentRules";
import type { EventFormInput, Event } from "@/lib/events/types";
import {
  deriveTicketSaleMode,
  hasAnySaleChannel,
  isPublishingStatus,
  isValidExternalTicketUrl,
  isValidWhatsAppNumber,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";

import type { EventImageFields } from "@/lib/events/getEventImage";
import {
  getEventImage,
  getEventImageSource,
  hasCustomEventImage,
} from "@/lib/events/getEventImage";

export type { EventImageFields } from "@/lib/events/getEventImage";

/** @deprecated Usar getEventImageSource */
export function getEventPrimaryImageUrl(event: EventImageFields): string | null {
  return getEventImageSource(event);
}

/** @deprecated Usar getEventImage */
export function getEventHeroBannerUrl(event: EventImageFields): string | null {
  return getEventImageSource(event);
}

/** @deprecated Usar getEventImage + variant card */
export function getEventCardImageUrl(event: EventImageFields): string | null {
  return getEventImageSource(event);
}

/** @deprecated Usar getEventImage + variant banner */
export function getEventHeroImageUrl(event: EventImageFields): string | null {
  return getEventImageSource(event);
}

/** Ya no se muestra afiche separado: el banner unificado cubre el detalle. */
export function getEventDetailPosterUrl(): string | null {
  return null;
}

export { getEventImage, getEventImageSource, hasCustomEventImage };

export function isEventFeaturedActive(
  event: Pick<Event, "is_featured" | "featured_until">,
): boolean {
  if (!event.is_featured) {
    return false;
  }

  if (!event.featured_until) {
    return true;
  }

  return new Date(event.featured_until) >= new Date();
}

export function formatEventDateShort(dateStr: string | null): string {
  if (!dateStr) {
    return "Sin fecha";
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(date);
}

/** Formato compacto para badges: "5 JUL 2026" */
export function formatEventDateCompact(dateStr: string | null): string {
  if (!dateStr) {
    return "SIN FECHA";
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  const dayPart = new Intl.DateTimeFormat("es-AR", { day: "numeric" }).format(
    date,
  );
  const monthPart = new Intl.DateTimeFormat("es-AR", { month: "short" })
    .format(date)
    .replace(/\./g, "")
    .toUpperCase();

  return `${dayPart} ${monthPart} ${year}`;
}

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function formatEventDate(dateStr: string | null): string {
  if (!dateStr) {
    return "Sin fecha";
  }
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatTime(timeStr: string | null): string | null {
  if (!timeStr) {
    return null;
  }

  return timeStr.slice(0, 5);
}

export function formatEventDateTime(
  eventDate: string | null,
  startTime: string | null,
  endTime: string | null,
  eventEndDate: string | null = null,
): string {
  if (!eventDate) {
    return "Sin fecha programada";
  }

  const dateLabel = formatEventDateRange(eventDate, eventEndDate);
  const start = formatTime(startTime);
  const end = formatTime(endTime);

  if (start && end) {
    return `${dateLabel} · ${start} a ${end}`;
  }

  if (start) {
    return `${dateLabel} · ${start}`;
  }

  return dateLabel;
}

function parseYmd(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatEventDateRange(
  eventDate: string,
  eventEndDate: string | null = null,
): string {
  if (!eventEndDate || eventEndDate === eventDate) {
    return formatEventDate(eventDate);
  }

  const start = parseYmd(eventDate);
  const end = parseYmd(eventEndDate);
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    const startDay = new Intl.DateTimeFormat("es-AR", { day: "numeric" }).format(
      start,
    );
    const endLabel = new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(end);
    return `${startDay} al ${endLabel}`;
  }

  return `${formatEventDate(eventDate)} al ${formatEventDate(eventEndDate)}`;
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseHomeOrder(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseEventFormData(formData: FormData): EventFormInput {
  const contentKind = String(formData.get("content_kind") ?? EVENT_CONTENT_KIND.EVENT);
  return {
    content_kind: (EVENT_CONTENT_KIND_VALUES.includes(
      contentKind as EventContentKind,
    )
      ? contentKind
      : EVENT_CONTENT_KIND.EVENT) as EventContentKind,
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    description: String(formData.get("description") ?? "").trim(),
    main_image_url: String(formData.get("main_image_url") ?? "").trim(),
    thumbnail_url: String(formData.get("thumbnail_url") ?? "").trim(),
    flyer_url: String(formData.get("flyer_url") ?? "").trim(),
    banner_url: String(formData.get("banner_url") ?? "").trim(),
    event_date: String(formData.get("event_date") ?? "").trim(),
    event_end_date: String(formData.get("event_end_date") ?? "").trim(),
    start_time: String(formData.get("start_time") ?? "").trim(),
    end_time: String(formData.get("end_time") ?? "").trim(),
    location_name: String(formData.get("location_name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    capacity: String(formData.get("capacity") ?? "").trim(),
    status: String(formData.get("status") ?? "draft") as EventStatus,
    audience: String(formData.get("audience") ?? "public") as EventAudience,
    is_featured: formData.get("is_featured") === "on",
    featured_ticket_label: String(
      formData.get("featured_ticket_label") ?? "",
    ).trim(),
    featured_until: String(formData.get("featured_until") ?? "").trim(),
    home_order: String(formData.get("home_order") ?? "0").trim(),
    external_ticket_url: String(formData.get("external_ticket_url") ?? "").trim(),
    sale_web_enabled: formData.get("sale_web_enabled") === "on",
    external_sale_enabled: formData.get("external_sale_enabled") === "on",
    sale_whatsapp_enabled: formData.get("sale_whatsapp_enabled") === "on",
    reservation_enabled: formData.get("reservation_enabled") === "on",
    whatsapp_sale_number: String(
      formData.get("whatsapp_sale_number") ?? "",
    ).trim(),
    whatsapp_sale_message: String(
      formData.get("whatsapp_sale_message") ?? "",
    ).trim(),
    ticket_sale_mode: "internal" as TicketSaleMode,
    qr_sell_tickets: formData.get("qr_sell_tickets") === "on",
    qr_products_enabled: formData.get("qr_products_enabled") === "on",
    qr_show_price_list: formData.get("qr_show_price_list") === "on",
    qr_sell_products: formData.get("qr_sell_products") === "on",
  };
}

function validateOptionalNonNegativeNumber(
  value: string,
  label: string,
): string | null {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return `${label} debe ser un número mayor o igual a 0.`;
  }

  return null;
}

export function validateEventForm(input: EventFormInput): string | null {
  if (!input.name) {
    return "El nombre es obligatorio.";
  }

  if (!input.slug) {
    return "El slug es obligatorio.";
  }

  if (!isValidSlug(input.slug)) {
    return "El slug debe estar en minúsculas, sin espacios y usar solo letras, números y guiones.";
  }

  if (!EVENT_CONTENT_KIND_VALUES.includes(input.content_kind)) {
    return "El tipo de contenido seleccionado no es válido.";
  }

  if (isPromotionContent(input)) {
    if (input.event_end_date) {
      return "Las promociones no admiten fecha final.";
    }
  } else if (!input.event_date) {
    return "La fecha es obligatoria para eventos.";
  }

  if (
    input.event_date &&
    input.event_end_date &&
    input.event_end_date < input.event_date
  ) {
    return "La fecha final debe ser igual o posterior a la fecha inicial.";
  }

  const capacityError = validateOptionalNonNegativeNumber(
    input.capacity,
    "La capacidad",
  );
  if (capacityError) {
    return capacityError;
  }

  if (!EVENT_STATUS_VALUES.includes(input.status)) {
    return "El estado seleccionado no es válido.";
  }

  if (!EVENT_AUDIENCE_VALUES.includes(input.audience)) {
    return "La visibilidad seleccionada no es válida.";
  }

  if (input.external_ticket_url && !isValidExternalTicketUrl(input.external_ticket_url)) {
    return "La URL externa debe ser válida y usar https://.";
  }

  if (
    input.sale_whatsapp_enabled &&
    input.whatsapp_sale_number &&
    !isValidWhatsAppNumber(input.whatsapp_sale_number)
  ) {
    return "El número de WhatsApp debe incluir código de país y ser válido.";
  }

  if (isPublishingStatus(input.status)) {
    if (isPromotionContent(input)) {
      if (!input.banner_url && !input.main_image_url) {
        return "Indicá al menos un banner para publicar la promoción.";
      }
      if (
        input.external_ticket_url &&
        !isValidExternalTicketUrl(input.external_ticket_url)
      ) {
        return "La URL de destino de la promoción debe ser válida y usar https://.";
      }
    } else {
      if (!hasAnySaleChannel(input)) {
        return "Seleccioná al menos un canal de venta o reserva antes de publicar el evento.";
      }

      if (
        input.external_sale_enabled &&
        !isValidExternalTicketUrl(input.external_ticket_url)
      ) {
        return "Indicá una URL externa válida (https://) para publicar con link externo.";
      }

      if (
        input.sale_whatsapp_enabled &&
        !isValidWhatsAppNumber(input.whatsapp_sale_number)
      ) {
        return "Indicá un número de WhatsApp válido para publicar con venta por WhatsApp.";
      }
    }
  }

  return null;
}

export function eventFormToPayload(input: EventFormInput) {
  const promotion = isPromotionContent(input);

  return {
    content_kind: input.content_kind,
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    main_image_url: input.main_image_url || null,
    thumbnail_url: input.thumbnail_url || null,
    flyer_url: input.flyer_url || null,
    banner_url: input.banner_url || null,
    event_date: input.event_date || null,
    event_end_date: promotion ? null : input.event_end_date || null,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    location_name: input.location_name || null,
    address: input.address || null,
    capacity: parseNullableNumber(input.capacity),
    status: input.status,
    audience: input.audience,
    ticket_sale_mode: promotion ? "internal" : deriveTicketSaleMode(input),
    external_ticket_url: input.external_ticket_url || null,
    sale_web_enabled: promotion ? false : input.sale_web_enabled,
    external_sale_enabled: promotion ? false : input.external_sale_enabled,
    sale_whatsapp_enabled: promotion ? false : input.sale_whatsapp_enabled,
    reservation_enabled: promotion ? false : input.reservation_enabled,
    whatsapp_sale_number: promotion ? null : input.whatsapp_sale_number || null,
    whatsapp_sale_message: promotion ? null : input.whatsapp_sale_message || null,
    is_featured: input.is_featured,
    featured_ticket_label: input.featured_ticket_label || null,
    featured_until: input.featured_until || null,
    home_order: parseHomeOrder(input.home_order),
  };
}

export function eventFormToInsertPayload(
  input: EventFormInput,
  createdBy: string,
) {
  return {
    ...eventFormToPayload(input),
    created_by: createdBy,
    financial_management_status: FINANCIAL_MANAGEMENT_STATUS.OPEN,
    financial_closed_at: null,
    financial_closed_by: null,
    social_presale_price: null,
    social_regular_price: null,
    box_office_preview: null,
  };
}

export function eventToFormInput(event: Event): EventFormInput {
  return {
    content_kind: event.content_kind ?? EVENT_CONTENT_KIND.EVENT,
    name: event.name,
    slug: event.slug,
    description: event.description ?? "",
    main_image_url: event.main_image_url ?? "",
    thumbnail_url: event.thumbnail_url ?? "",
    flyer_url: event.flyer_url ?? "",
    banner_url: event.banner_url ?? "",
    event_date: event.event_date ?? "",
    event_end_date: event.event_end_date ?? "",
    start_time: formatTime(event.start_time) ?? "",
    end_time: formatTime(event.end_time) ?? "",
    location_name: event.location_name ?? "",
    address: event.address ?? "",
    capacity: event.capacity != null ? String(event.capacity) : "",
    status: event.status,
    audience: event.audience ?? EVENT_AUDIENCE.PUBLIC,
    is_featured: event.is_featured,
    featured_ticket_label: event.featured_ticket_label ?? "",
    featured_until: event.featured_until
      ? event.featured_until.slice(0, 16)
      : "",
    home_order: String(event.home_order ?? 0),
    external_ticket_url: event.external_ticket_url ?? "",
    ticket_sale_mode: event.ticket_sale_mode,
    sale_web_enabled: resolveSaleChannels(event).saleWebEnabled,
    external_sale_enabled: resolveSaleChannels(event).externalSaleEnabled,
    sale_whatsapp_enabled: resolveSaleChannels(event).saleWhatsappEnabled,
    reservation_enabled: resolveSaleChannels(event).reservationEnabled,
    whatsapp_sale_number: event.whatsapp_sale_number ?? "",
    whatsapp_sale_message: event.whatsapp_sale_message ?? "",
    qr_sell_tickets: event.qr_sell_tickets ?? false,
    qr_products_enabled: event.qr_products_enabled ?? false,
    qr_show_price_list: event.qr_show_price_list ?? false,
    qr_sell_products: event.qr_sell_products ?? false,
  };
}
