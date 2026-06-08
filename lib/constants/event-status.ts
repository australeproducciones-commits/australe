export const EVENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
  SOLD_OUT: "sold_out",
  FINISHED: "finished",
  CANCELLED: "cancelled",
  HIDDEN: "hidden",
} as const;

export type EventStatus = (typeof EVENT_STATUS)[keyof typeof EVENT_STATUS];

export const EVENT_STATUS_VALUES = Object.values(EVENT_STATUS);

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  [EVENT_STATUS.DRAFT]: "Borrador",
  [EVENT_STATUS.PUBLISHED]: "Publicado",
  [EVENT_STATUS.SOLD_OUT]: "Agotado",
  [EVENT_STATUS.FINISHED]: "Finalizado",
  [EVENT_STATUS.CANCELLED]: "Cancelado",
  [EVENT_STATUS.HIDDEN]: "Oculto",
};

export const TICKET_SALE_MODE = {
  INTERNAL: "internal",
  EXTERNAL: "external",
  BOTH: "both",
  DISABLED: "disabled",
} as const;

export type TicketSaleMode =
  (typeof TICKET_SALE_MODE)[keyof typeof TICKET_SALE_MODE];

export const TICKET_SALE_MODE_VALUES = Object.values(TICKET_SALE_MODE);

export const TICKET_SALE_MODE_LABELS: Record<TicketSaleMode, string> = {
  [TICKET_SALE_MODE.INTERNAL]: "Interno",
  [TICKET_SALE_MODE.EXTERNAL]: "Externo",
  [TICKET_SALE_MODE.BOTH]: "Interno y externo",
  [TICKET_SALE_MODE.DISABLED]: "Deshabilitado",
};
