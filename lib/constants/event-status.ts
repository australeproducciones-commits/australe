export const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  SOLD_OUT: "sold_out",
  CANCELLED: "cancelled",
  FINISHED: "finished",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EVENT_STATUS.DRAFT]: "Borrador",
  [EVENT_STATUS.PUBLISHED]: "Publicado",
  [EVENT_STATUS.SOLD_OUT]: "Agotado",
  [EVENT_STATUS.CANCELLED]: "Cancelado",
  [EVENT_STATUS.FINISHED]: "Finalizado",
};
