import {
  EVENT_STATUS_VALUES,
  TICKET_SALE_MODE_VALUES,
  type EventStatus,
  type TicketSaleMode,
} from "@/lib/constants/event-status";
import type { EventFormInput, Event } from "@/lib/events/types";

export type EventImageFields = Pick<Event, "flyer_url" | "banner_url">;

/** Cards y listados: flyer primero, banner como respaldo. */
export function getEventCardImageUrl(event: EventImageFields): string | null {
  return event.flyer_url || event.banner_url || null;
}

/** Portada y destacado: banner primero, flyer como respaldo. */
export function getEventHeroImageUrl(event: EventImageFields): string | null {
  return event.banner_url || event.flyer_url || null;
}

/** Afiche en detalle: solo si hay flyer y no duplica la portada (solo-flyer). */
export function getEventDetailPosterUrl(event: EventImageFields): string | null {
  if (!event.flyer_url) {
    return null;
  }

  if (event.banner_url) {
    return event.flyer_url;
  }

  return null;
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

export function parseEventFormData(formData: FormData): EventFormInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    description: String(formData.get("description") ?? "").trim(),
    flyer_url: String(formData.get("flyer_url") ?? "").trim(),
    banner_url: String(formData.get("banner_url") ?? "").trim(),
    event_date: String(formData.get("event_date") ?? "").trim(),
    start_time: String(formData.get("start_time") ?? "").trim(),
    end_time: String(formData.get("end_time") ?? "").trim(),
    location_name: String(formData.get("location_name") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    capacity: String(formData.get("capacity") ?? "").trim(),
    status: String(formData.get("status") ?? "draft") as EventStatus,
    is_featured: formData.get("is_featured") === "on",
    external_ticket_url: String(formData.get("external_ticket_url") ?? "").trim(),
    ticket_sale_mode: String(
      formData.get("ticket_sale_mode") ?? "internal",
    ) as TicketSaleMode,
  };
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

  if (input.capacity) {
    const capacity = Number(input.capacity);
    if (Number.isNaN(capacity) || capacity < 0) {
      return "La capacidad debe ser un número mayor o igual a 0.";
    }
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

export function eventFormToPayload(
  input: EventFormInput,
  createdBy?: string | null,
) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    flyer_url: input.flyer_url || null,
    banner_url: input.banner_url || null,
    event_date: input.event_date,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    location_name: input.location_name || null,
    address: input.address || null,
    capacity: input.capacity ? Number(input.capacity) : null,
    status: input.status,
    is_featured: input.is_featured,
    external_ticket_url: input.external_ticket_url || null,
    ticket_sale_mode: input.ticket_sale_mode,
    created_by: createdBy ?? null,
  };
}

export function eventToFormInput(event: {
  name: string;
  slug: string;
  description: string | null;
  flyer_url: string | null;
  banner_url: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  capacity: number | null;
  status: EventStatus;
  is_featured: boolean;
  external_ticket_url: string | null;
  ticket_sale_mode: TicketSaleMode;
}): EventFormInput {
  return {
    name: event.name,
    slug: event.slug,
    description: event.description ?? "",
    flyer_url: event.flyer_url ?? "",
    banner_url: event.banner_url ?? "",
    event_date: event.event_date,
    start_time: formatTime(event.start_time) ?? "",
    end_time: formatTime(event.end_time) ?? "",
    location_name: event.location_name ?? "",
    address: event.address ?? "",
    capacity: event.capacity != null ? String(event.capacity) : "",
    status: event.status,
    is_featured: event.is_featured,
    external_ticket_url: event.external_ticket_url ?? "",
    ticket_sale_mode: event.ticket_sale_mode,
  };
}
