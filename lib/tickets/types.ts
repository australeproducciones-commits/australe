export type TicketType = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  public_price: number;
  community_price: number;
  stock_total: number | null;
  stock_sold: number;
  max_per_order: number;
  sale_start_at: string | null;
  sale_end_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TicketTypeFormInput = {
  name: string;
  description: string;
  public_price: string;
  community_price: string;
  stock_total: string;
  max_per_order: string;
  sale_start_at: string;
  sale_end_at: string;
  is_active: boolean;
  sort_order: string;
};

export type TicketTypeActionResult = {
  success: boolean;
  error?: string;
  ticketTypeId?: string;
};

export const SUGGESTED_TICKET_TYPE_NAMES = [
  "Anticipada",
  "General",
  "Comunidad",
  "Puerta",
  "VIP",
  "Cortesía",
] as const;
