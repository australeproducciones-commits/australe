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

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
