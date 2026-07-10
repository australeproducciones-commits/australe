import { EVENT_TIMEZONE } from "@/lib/events/eventTiming";

/** Offset fijo UTC-3 (Mendoza no usa DST desde 2009). */
const MENDOZA_OFFSET = "-03:00";

const DATETIME_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Interpreta un valor de `datetime-local` como hora civil en Mendoza y devuelve ISO UTC.
 * No depende de la zona horaria del navegador ni del servidor.
 */
export function mendozaDatetimeLocalToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const match = DATETIME_LOCAL_RE.exec(trimmed);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const instant = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:00${MENDOZA_OFFSET}`,
  );

  if (Number.isNaN(instant.getTime())) {
    return null;
  }

  return instant.toISOString();
}

/**
 * Formatea un instante UTC para un input `datetime-local` mostrando hora de Mendoza.
 */
export function isoToMendozaDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  let hour = get("hour");
  if (hour === "24") {
    hour = "00";
  }

  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** Fecha y hora legibles en español argentino, siempre en zona Mendoza. */
export function formatStreamDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-AR", {
    timeZone: EVENT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
