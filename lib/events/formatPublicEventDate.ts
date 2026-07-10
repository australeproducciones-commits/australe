import { formatEventDateTime } from "@/lib/events/utils";

/** Fecha y horario del evento para la vista pública (badge principal). */
export function formatPublicEventDate(
  eventDate: string | null,
  startTime: string | null,
  endTime: string | null,
  eventEndDate: string | null = null,
): string {
  if (!eventDate) {
    return "Sin fecha programada";
  }

  return formatEventDateTime(eventDate, startTime, endTime, eventEndDate);
}
