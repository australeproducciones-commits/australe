import {
  EVENT_STATUS_VALUES,
  TICKET_SALE_MODE_VALUES,
  type EventStatus,
  type TicketSaleMode,
} from "@/lib/constants/event-status";
import type { EventFormInput, Event } from "@/lib/events/types";

export type EventImageFields = Pick<
  Event,
  "main_image_url" | "thumbnail_url" | "flyer_url" | "banner_url"
>;

/** Imagen principal con fallback a banner, flyer o miniatura. */
export function getEventPrimaryImageUrl(event: EventImageFields): string | null {
  return (
    event.main_image_url ||
    event.banner_url ||
    event.flyer_url ||
    event.thumbnail_url ||
    null
  );
}

/** Imagen para hero/home: banner primero, luego portada y miniatura. */
export function getEventHeroBannerUrl(event: EventImageFields): string | null {
  return (
    event.banner_url ||
    event.main_image_url ||
    event.thumbnail_url ||
    event.flyer_url ||
    null
  );
}

/** @deprecated Usar getEventPrimaryImageUrl + EventImage variant="card" */
export function getEventCardImageUrl(event: EventImageFields): string | null {
  return getEventPrimaryImageUrl(event);
}

/** @deprecated Usar getEventPrimaryImageUrl + EventImage variant="banner" */
export function getEventHeroImageUrl(event: EventImageFields): string | null {
  return getEventPrimaryImageUrl(event);
}

/** Afiche en detalle: flyer legacy si difiere de la portada unificada. */
export function getEventDetailPosterUrl(event: EventImageFields): string | null {
  if (event.main_image_url) {
    return null;
  }

  if (!event.flyer_url) {
    return null;
  }

  if (event.banner_url && event.flyer_url !== event.banner_url) {
    return event.flyer_url;
  }

  if (!event.banner_url) {
    return event.flyer_url;
  }

  return null;
}

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

export function formatEventDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(date);
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

export function formatEventDate(dateStr: string): string {
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
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
): string {
  const dateLabel = formatEventDate(eventDate);
  const start = formatTime(startTime);
  const end = formatTime(endTime);

  if (start && end) {
    return `${dateLabel} · ${start} – ${end}`;
  }

  if (start) {
    return `${dateLabel} · ${start}`;
  }

  return dateLabel;
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
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    description: String(formData.get("description") ?? "").trim(),
    main_image_url: String(formData.get("main_image_url") ?? "").trim(),
    thumbnail_url: String(formData.get("thumbnail_url") ?? "").trim(),
    flyer_url: String(formData.get("flyer_url") ?? "").trim(),
    banner_url: String(formData.get("banner_url") ?? "").trim(),
    social_presale_price: String(formData.get("social_presale_price") ?? "").trim(),
    social_regular_price: String(formData.get("social_regular_price") ?? "").trim(),
    box_office_preview: String(formData.get("box_office_preview") ?? "").trim(),
    event_date: String(formData.get("event_date") ?? "").trim(),
    start_time: String(formData.get("start_time") ?? "").trim(),
    end_time: String(formData.get("end_time") ?? "").trim(),
    location_name: String(formData.get("location_name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    capacity: String(formData.get("capacity") ?? "").trim(),
    status: String(formData.get("status") ?? "draft") as EventStatus,
    is_featured: formData.get("is_featured") === "on",
    featured_ticket_label: String(
      formData.get("featured_ticket_label") ?? "",
    ).trim(),
    featured_until: String(formData.get("featured_until") ?? "").trim(),
    home_order: String(formData.get("home_order") ?? "0").trim(),
    external_ticket_url: String(formData.get("external_ticket_url") ?? "").trim(),
    ticket_sale_mode: String(
      formData.get("ticket_sale_mode") ?? "internal",
    ) as TicketSaleMode,
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

  if (!input.event_date) {
    return "La fecha es obligatoria.";
  }

  const capacityError = validateOptionalNonNegativeNumber(
    input.capacity,
    "La capacidad",
  );
  if (capacityError) {
    return capacityError;
  }

  const presaleError = validateOptionalNonNegativeNumber(
    input.social_presale_price,
    "El precio Punto Social anticipado",
  );
  if (presaleError) {
    return presaleError;
  }

  const regularError = validateOptionalNonNegativeNumber(
    input.social_regular_price,
    "El precio Punto Social normal",
  );
  if (regularError) {
    return regularError;
  }

  if (!EVENT_STATUS_VALUES.includes(input.status)) {
    return "El estado seleccionado no es válido.";
  }

  if (!TICKET_SALE_MODE_VALUES.includes(input.ticket_sale_mode)) {
    return "El modo de venta seleccionado no es válido.";
  }

  if (
    (input.ticket_sale_mode === "external" || input.ticket_sale_mode === "both") &&
    !input.external_ticket_url
  ) {
    return "Indicá el link externo de entradas para este modo de venta.";
  }

  return null;
}

export function eventFormToPayload(input: EventFormInput) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    main_image_url: input.main_image_url || null,
    thumbnail_url: input.thumbnail_url || null,
    flyer_url: input.flyer_url || null,
    banner_url: input.banner_url || null,
    social_presale_price: parseNullableNumber(input.social_presale_price),
    social_regular_price: parseNullableNumber(input.social_regular_price),
    box_office_preview: input.box_office_preview || null,
    event_date: input.event_date,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    location_name: input.location_name || null,
    address: input.address || null,
    capacity: parseNullableNumber(input.capacity),
    status: input.status,
    ticket_sale_mode: input.ticket_sale_mode,
    external_ticket_url: input.external_ticket_url || null,
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
  };
}

export function eventToFormInput(event: Event): EventFormInput {
  return {
    name: event.name,
    slug: event.slug,
    description: event.description ?? "",
    main_image_url: event.main_image_url ?? "",
    thumbnail_url: event.thumbnail_url ?? "",
    flyer_url: event.flyer_url ?? "",
    banner_url: event.banner_url ?? "",
    social_presale_price:
      event.social_presale_price != null
        ? String(event.social_presale_price)
        : "",
    social_regular_price:
      event.social_regular_price != null
        ? String(event.social_regular_price)
        : "",
    box_office_preview: event.box_office_preview ?? "",
    event_date: event.event_date,
    start_time: formatTime(event.start_time) ?? "",
    end_time: formatTime(event.end_time) ?? "",
    location_name: event.location_name ?? "",
    address: event.address ?? "",
    capacity: event.capacity != null ? String(event.capacity) : "",
    status: event.status,
    is_featured: event.is_featured,
    featured_ticket_label: event.featured_ticket_label ?? "",
    featured_until: event.featured_until
      ? event.featured_until.slice(0, 16)
      : "",
    home_order: String(event.home_order ?? 0),
    external_ticket_url: event.external_ticket_url ?? "",
    ticket_sale_mode: event.ticket_sale_mode,
    qr_sell_tickets: event.qr_sell_tickets ?? false,
    qr_products_enabled: event.qr_products_enabled ?? false,
    qr_show_price_list: event.qr_show_price_list ?? false,
    qr_sell_products: event.qr_sell_products ?? false,
  };
}
