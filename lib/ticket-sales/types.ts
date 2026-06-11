import type { Event } from "@/lib/events/types";
import type { TicketType } from "@/lib/tickets/types";

export const TICKET_PAYMENT_METHOD = {
  PENDING: "pending",
  CASH: "cash",
  TRANSFER: "transfer",
  MERCADOPAGO_MANUAL: "mercadopago_manual",
  CARD: "card",
  COURTESY: "courtesy",
  EXTERNAL: "external",
} as const;

export type TicketPaymentMethod =
  (typeof TICKET_PAYMENT_METHOD)[keyof typeof TICKET_PAYMENT_METHOD];

export const TICKET_PAYMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const;

export type TicketPaymentStatus =
  (typeof TICKET_PAYMENT_STATUS)[keyof typeof TICKET_PAYMENT_STATUS];

export const TICKET_STATUS = {
  RESERVED: "reserved",
  VALID: "valid",
  USED: "used",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type TicketStatus = (typeof TICKET_STATUS)[keyof typeof TICKET_STATUS];

export const SALES_CHANNEL = {
  WEB: "web",
  ADMIN_MANUAL: "admin_manual",
  DOOR: "door",
  EXTERNAL: "external",
  COURTESY: "courtesy",
} as const;

export type SalesChannel = (typeof SALES_CHANNEL)[keyof typeof SALES_CHANNEL];

export type Ticket = {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  user_id: string | null;
  community_member_id: string | null;
  buyer_name: string;
  buyer_whatsapp: string | null;
  buyer_dni: string | null;
  qr_token: string;
  qr_image_url: string | null;
  price_paid: number;
  original_price: number;
  discount_amount: number;
  payment_method: TicketPaymentMethod;
  payment_status: TicketPaymentStatus;
  ticket_status: TicketStatus;
  sales_channel: SalesChannel;
  reservation_expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  sold_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketWithTypeName = Ticket & {
  ticket_type_name: string | null;
};

export type CustomerTicket = Ticket & {
  event_name: string;
  event_slug: string;
  event_date: string;
  ticket_type_name: string | null;
};

export type ReservationLineInput = {
  ticketTypeId: string;
  quantity: number;
};

export type ReservationBuyerInput = {
  buyer_name: string;
  buyer_whatsapp: string;
  buyer_dni: string;
};

export type ReservationBuyerSummary = {
  buyerName: string;
  buyerWhatsapp?: string | null;
  buyerDni?: string | null;
};

export type ReservationTicketCreatedSummary = {
  ticketTypeName: string;
  qrToken: string;
  unitPrice: number;
  paymentStatus: TicketPaymentStatus;
  ticketStatus: TicketStatus;
};

export type ReservationTicketLineSummary = {
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type ReservationKioskLineSummary = {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type ReservationKioskOrderSummary = {
  orderCode: string;
  totalAmount: number;
  lines: ReservationKioskLineSummary[];
};

export type ReservationActionResult = {
  success: boolean;
  error?: string;
  ticketCount?: number;
  reservationExpiresAt?: string;
  buyer?: ReservationBuyerSummary;
  tickets?: ReservationTicketCreatedSummary[];
  ticketsTotal?: number;
  ticketLines?: ReservationTicketLineSummary[];
  kioskOrder?: ReservationKioskOrderSummary;
  kioskError?: string;
  grandTotal?: number;
};

export type TicketAdminActionResult = {
  success: boolean;
  error?: string;
};

export type EventReservationContext = {
  event: Event;
  ticketTypes: TicketType[];
};
