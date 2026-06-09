import { ROUTES } from "@/lib/constants/routes";

/** Segmentos reservados que no son UUID de evento. */
export const RESERVED_EVENT_ADMIN_SEGMENTS = ["crear"] as const;

export function isReservedEventAdminSegment(
  id: string,
): id is (typeof RESERVED_EVENT_ADMIN_SEGMENTS)[number] {
  return (RESERVED_EVENT_ADMIN_SEGMENTS as readonly string[]).includes(id);
}

export function isEventIdSegment(id: string): boolean {
  return !isReservedEventAdminSegment(id);
}

/** UUID v4 aproximado para validar rutas de edición. */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function getAdminEventEditPath(id: string): string {
  return ROUTES.adminEvento(id);
}
