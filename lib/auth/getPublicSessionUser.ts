import { resolvePublicSessionUser } from "@/lib/auth/resolvePublicSessionUser";
import type { Profile } from "@/lib/auth/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type PublicSessionUser = {
  profile: Profile;
  email: string | null;
};

export async function getPublicSessionUser(
  supabase: SupabaseClient<Database>,
): Promise<PublicSessionUser | null> {
  return resolvePublicSessionUser(supabase);
}
