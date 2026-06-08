import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth/types";
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
    .select("id, full_name, whatsapp, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}
