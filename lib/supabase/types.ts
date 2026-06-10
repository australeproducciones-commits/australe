/**
 * Tipos de la base de datos de Supabase.
 * Reemplazar con tipos generados por CLI cuando exista el esquema:
 * npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EventRow = {
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
  status: string;
  is_featured: boolean;
  external_ticket_url: string | null;
  ticket_sale_mode: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketTypeRow = {
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

export type CommunityMemberRow = {
  id: string;
  profile_id: string | null;
  full_name: string;
  whatsapp: string;
  dni: string;
  birth_date: string;
  status: string;
  community_code: string;
  created_at: string;
  updated_at: string;
};

export type TicketRow = {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  community_member_id: string | null;
  buyer_name: string;
  buyer_whatsapp: string | null;
  buyer_dni: string | null;
  qr_token: string;
  qr_image_url: string | null;
  price_paid: number;
  original_price: number;
  discount_amount: number;
  payment_method: string;
  payment_status: string;
  ticket_status: string;
  sales_channel: string;
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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      events: {
        Row: EventRow;
        Insert: Omit<EventRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventRow>;
        Relationships: [];
      };
      ticket_types: {
        Row: TicketTypeRow;
        Insert: Omit<TicketTypeRow, "id" | "created_at" | "updated_at" | "stock_sold"> & {
          id?: string;
          stock_sold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TicketTypeRow>;
        Relationships: [];
      };
      community_members: {
        Row: CommunityMemberRow;
        Insert: Omit<
          CommunityMemberRow,
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CommunityMemberRow>;
        Relationships: [];
      };
      tickets: {
        Row: TicketRow;
        Insert: Partial<TicketRow> & {
          event_id: string;
          buyer_name: string;
          qr_token: string;
        };
        Update: Partial<TicketRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_profile: {
        Args: {
          p_full_name: string | null;
          p_whatsapp: string | null;
        };
        Returns: ProfileRow;
      };
      reserve_tickets: {
        Args: {
          p_event_id: string;
          p_ticket_type_id: string;
          p_quantity: number;
          p_buyer_name: string;
          p_buyer_whatsapp: string | null;
          p_buyer_dni: string | null;
        };
        Returns: TicketRow[];
      };
      cancel_ticket: {
        Args: {
          p_ticket_id: string;
          p_cancel_reason: string | null;
          p_mark_as_expired: boolean;
        };
        Returns: TicketRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
