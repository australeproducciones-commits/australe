import type {
  EventStatus,
  TicketSaleMode,
} from "@/lib/constants/event-status";

export type Event = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  main_image_url: string | null;
  thumbnail_url: string | null;
  flyer_url: string | null;
  banner_url: string | null;
  social_presale_price: number | null;
  social_regular_price: number | null;
  box_office_preview: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  capacity: number | null;
  status: EventStatus;
  is_featured: boolean;
  featured_ticket_label: string | null;
  featured_until: string | null;
  home_order: number;
  external_ticket_url: string | null;
  ticket_sale_mode: TicketSaleMode;
  sales_qr_enabled: boolean;
  sales_qr_code: string | null;
  sales_qr_url: string | null;
  qr_sell_tickets: boolean;
  qr_products_enabled: boolean;
  qr_show_price_list: boolean;
  qr_sell_products: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventFormInput = {
  name: string;
  slug: string;
  description: string;
  main_image_url: string;
  thumbnail_url: string;
  flyer_url: string;
  banner_url: string;
  social_presale_price: string;
  social_regular_price: string;
  box_office_preview: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  address: string;
  capacity: string;
  status: EventStatus;
  is_featured: boolean;
  featured_ticket_label: string;
  featured_until: string;
  home_order: string;
  external_ticket_url: string;
  ticket_sale_mode: TicketSaleMode;
  qr_sell_tickets: boolean;
  qr_products_enabled: boolean;
  qr_show_price_list: boolean;
  qr_sell_products: boolean;
};

export type EventActionResult = {
  success: boolean;
  error?: string;
  eventId?: string;
};
