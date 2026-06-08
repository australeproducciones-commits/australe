import type {
  EventStatus,
  TicketSaleMode,
} from "@/lib/constants/event-status";

export type Event = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  flyer_url: string | null;
  banner_url: string | null;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  capacity: number | null;
  status: EventStatus;
  is_featured: boolean;
  external_ticket_url: string | null;
  ticket_sale_mode: TicketSaleMode;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventFormInput = {
  name: string;
  slug: string;
  description: string;
  flyer_url: string;
  banner_url: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location_name: string;
  address: string;
  capacity: string;
  status: EventStatus;
  is_featured: boolean;
  external_ticket_url: string;
  ticket_sale_mode: TicketSaleMode;
};

export type EventActionResult = {
  success: boolean;
  error?: string;
  eventId?: string;
};
