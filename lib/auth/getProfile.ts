import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth/types";
import { normalizeRole } from "@/lib/auth/routeAccess";
import type { Database } from "@/lib/supabase/types";

export async function getProfile(
  supabase: SupabaseClient<Database>,
): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, whatsapp, role, is_active, staff_all_events")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    full_name: data.full_name,
    whatsapp: data.whatsapp,
    role: normalizeRole(data.role),
    is_active: data.is_active,
    staff_all_events: data.staff_all_events ?? false,
  };
}
