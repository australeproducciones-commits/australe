import { formatEventDateTime } from "@/lib/events/utils";

/** Fecha y horario del evento para la vista pública (badge principal). */
export function formatPublicEventDate(
  eventDate: string,
  startTime: string | null,
  endTime: string | null,
): string {
  return formatEventDateTime(eventDate, startTime, endTime);
}
