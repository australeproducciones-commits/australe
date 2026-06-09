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

export type TicketRow = {
  id: string;
  ticket_type_id: string | null;
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
      tickets: {
        Row: TicketRow;
        Insert: Partial<TicketRow> & { id?: string };
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
