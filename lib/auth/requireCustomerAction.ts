import { getProfile } from "@/lib/auth/getProfile";
import { ROLES } from "@/lib/constants/roles";
import { createClient } from "@/lib/supabase/server";

export async function requireCustomerAction() {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || !profile.is_active) {
    return {
      error:
        "Iniciá sesión con una cuenta de cliente para acceder a la preventa.",
    } as const;
  }

  if (profile.role === ROLES.CASHIER || profile.role === ROLES.DOOR) {
    return {
      error: "Tu cuenta no puede acceder a la preventa desde la web.",
    } as const;
  }

  return { supabase, profile } as const;
}
