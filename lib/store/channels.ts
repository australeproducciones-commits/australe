import { EVENT_STATUS } from "@/lib/constants/event-status";
import { isEventFinished } from "@/lib/events/eventTiming";
import type { Event } from "@/lib/events/types";
import type { EventStoreProduct, StoreProduct } from "@/lib/store/types";
import { isStoreProductPubliclyAvailable } from "@/lib/store/utils";

export type EventCommerceSchedule = Pick<
  Event,
  "event_date" | "event_end_date" | "start_time" | "end_time"
> & {
  status: Event["status"] | string;
};

export type EventStoreAssociationSchedule = Pick<
  EventStoreProduct,
  "is_active" | "starts_at" | "ends_at"
>;

export type StoreGeneralCatalogProduct = Pick<
  StoreProduct,
  | "is_active"
  | "status"
  | "show_in_store"
  | "community_only"
  | "available_from"
  | "available_until"
>;

/** Evento publicado y dentro de la ventana comercial (fecha/hora Mendoza). */
export function isEventCommerceEligible(
  event: EventCommerceSchedule,
  now = new Date(),
): boolean {
  if (event.status !== EVENT_STATUS.PUBLISHED) {
    return false;
  }

  if (!event.event_date) {
    return true;
  }

  return !isEventFinished(
    {
      event_date: event.event_date,
      event_end_date: event.event_end_date,
      start_time: event.start_time,
      end_time: event.end_time,
    },
    now,
  );
}

export function isEventStoreAssociationActive(
  association: EventStoreAssociationSchedule,
  now = new Date(),
): boolean {
  if (!association.is_active) {
    return false;
  }

  if (association.starts_at && new Date(association.starts_at) > now) {
    return false;
  }

  if (association.ends_at && new Date(association.ends_at) < now) {
    return false;
  }

  return true;
}

/** Catálogo general /tienda (sin contexto de evento). */
export function isStoreProductVisibleInGeneralCatalog(
  product: StoreGeneralCatalogProduct,
  isCommunityMember: boolean,
  now = new Date(),
): boolean {
  if (!isStoreProductPubliclyAvailable(product, now)) {
    return false;
  }

  if (!product.show_in_store) {
    return false;
  }

  if (product.community_only && !isCommunityMember) {
    return false;
  }

  return true;
}
