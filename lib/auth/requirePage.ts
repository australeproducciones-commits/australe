import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/getProfile";
import { buildLoginUrl } from "@/lib/auth/loginRedirect";
import { getRedirectPathForRole } from "@/lib/auth/redirectByRole";
import { getEffectiveRole } from "@/lib/auth/routeAccess";
import type { Profile } from "@/lib/auth/types";
import { ROLES, type Role } from "@/lib/constants/roles";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";

export type StaffPanelRole = typeof ROLES.CASHIER | typeof ROLES.DOOR;

export async function requireAdminUsersPage(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
}> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || !profile.is_active) {
    redirect(buildLoginUrl(ROUTES.adminUsuarios));
  }

  if (profile.role !== ROLES.ADMIN) {
    redirect(getRedirectPathForRole(getEffectiveRole(profile)));
  }

  return { supabase, profile };
}

export async function requireStaffPanelPage(panelRole: StaffPanelRole): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
}> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const panelPath =
    panelRole === ROLES.CASHIER ? ROUTES.adminCajero : ROUTES.adminPuerta;

  if (!profile || !profile.is_active) {
    redirect(buildLoginUrl(panelPath));
  }

  if (profile.role === ROLES.ADMIN) {
    return { supabase, profile };
  }

  if (profile.role === panelRole) {
    return { supabase, profile };
  }

  redirect(getRedirectPathForRole(getEffectiveRole(profile)));
}

export async function requireActiveInternalPage(
  allowedRoles: readonly Role[],
  returnPath: string,
): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Profile;
}> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile || !profile.is_active) {
    redirect(buildLoginUrl(returnPath));
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect(getRedirectPathForRole(getEffectiveRole(profile)));
  }

  return { supabase, profile };
}
