import { normalizeRole } from "@/lib/auth/routeAccess";
import type { PublicSessionUser } from "@/lib/auth/getPublicSessionUser";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const PROFILE_COLUMNS =
  "id, full_name, whatsapp, role, is_active, staff_all_events" as const;

export async function resolvePublicSessionUser(
  supabase: SupabaseClient<Database>,
): Promise<PublicSessionUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    await supabase.auth.signOut({ scope: "global" });
    return null;
  }

  if (!user) {
    return null;
  }

  const { data, error: profileError } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !data) {
    return null;
  }

  return {
    email: user.email ?? null,
    profile: {
      id: data.id,
      full_name: data.full_name,
      whatsapp: data.whatsapp,
      role: normalizeRole(data.role),
      is_active: data.is_active,
      staff_all_events: data.staff_all_events ?? false,
    },
  };
}

export function getSessionUserInitial(sessionUser: PublicSessionUser): string {
  const name = sessionUser.profile.full_name?.trim();
  if (name) {
    return name.charAt(0).toUpperCase();
  }

  const email = sessionUser.email?.trim();
  if (email) {
    return email.charAt(0).toUpperCase();
  }

  return "?";
}
