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

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
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
