import { cache } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/getProfile";
import { getEffectiveRole } from "@/lib/auth/routeAccess";
import type { Profile } from "@/lib/auth/types";
import { ROLES } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

export const getRequestSupabase = cache(async () => createClient());

export const getRequestProfile = cache(async () => {
  const supabase = await getRequestSupabase();
  return getProfile(supabase);
});

export const getAdminRequestContext = cache(async () => {
  const supabase = await getRequestSupabase();
  const profile = await getRequestProfile();

  if (!profile || profile.role !== ROLES.ADMIN || !profile.is_active) {
    redirect(ROUTES.admin);
  }

  return { supabase, profile };
});

export async function requireAdminPage() {
  return getAdminRequestContext();
}

export function getEffectiveRoleFromProfile(profile: Profile | null) {
  return getEffectiveRole(profile);
}
