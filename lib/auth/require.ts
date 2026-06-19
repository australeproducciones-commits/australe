import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile } from "@/lib/auth/getProfile";
import type { Profile } from "@/lib/auth/types";
import { ROLES, type Role } from "@/lib/constants/roles";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

const MESSAGES = {
  notAuthenticated: "Iniciá sesión para continuar.",
  inactive: "Tu cuenta está inactiva. Contactá a un administrador.",
  noPermission: "No tenés permiso para realizar esta acción.",
  eventNotAuthorized: "No tenés acceso a este evento.",
} as const;

export type AuthGuardError = { error: string };

export type AuthGuardSuccess = {
  supabase: SupabaseClient<Database>;
  profile: Profile;
  userId: string;
};

export type AuthGuardResult = AuthGuardError | AuthGuardSuccess;

export async function requireAuthenticatedUser(): Promise<
  AuthGuardError | Omit<AuthGuardSuccess, "profile"> & { profile: null }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: MESSAGES.notAuthenticated };
  }

  return { supabase, profile: null, userId: user.id };
}

export async function requireActiveProfile(): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: MESSAGES.notAuthenticated };
  }

  const profile = await getProfile(supabase);

  if (!profile) {
    return { error: MESSAGES.notAuthenticated };
  }

  if (!profile.is_active) {
    return { error: MESSAGES.inactive };
  }

  return { supabase, profile, userId: user.id };
}

export async function requireAdmin(): Promise<AuthGuardResult> {
  const auth = await requireActiveProfile();
  if ("error" in auth) {
    return auth;
  }

  if (auth.profile.role !== ROLES.ADMIN) {
    return { error: MESSAGES.noPermission };
  }

  return auth;
}

export async function requireInternalRole(
  allowedRoles: readonly Role[],
): Promise<AuthGuardResult> {
  const auth = await requireActiveProfile();
  if ("error" in auth) {
    return auth;
  }

  if (!allowedRoles.includes(auth.profile.role)) {
    return { error: MESSAGES.noPermission };
  }

  return auth;
}

export async function hasStaffEventAccess(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  eventId: string,
  allowedRoles: readonly Role[],
): Promise<boolean> {
  if (!profile.is_active) {
    return false;
  }

  if (profile.role === ROLES.ADMIN) {
    return allowedRoles.includes(ROLES.ADMIN);
  }

  if (!allowedRoles.includes(profile.role)) {
    return false;
  }

  if (profile.role === ROLES.CUSTOMER) {
    return false;
  }

  if (profile.staff_all_events) {
    return true;
  }

  if (profile.role !== ROLES.CASHIER && profile.role !== ROLES.DOOR) {
    return false;
  }

  const { data, error } = await supabase
    .from("event_staff")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", profile.id)
    .eq("role", profile.role)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("hasStaffEventAccess:", error);
    return false;
  }

  return data != null;
}

export async function requireStaffForEvent(
  eventId: string,
  allowedRoles: readonly Role[] = [ROLES.ADMIN, ROLES.CASHIER, ROLES.DOOR],
): Promise<AuthGuardResult> {
  const auth = await requireActiveProfile();
  if ("error" in auth) {
    return auth;
  }

  if (auth.profile.role === ROLES.CUSTOMER) {
    return { error: MESSAGES.noPermission };
  }

  if (!allowedRoles.includes(auth.profile.role)) {
    return { error: MESSAGES.noPermission };
  }

  const allowed = await hasStaffEventAccess(
    auth.supabase,
    auth.profile,
    eventId,
    allowedRoles,
  );

  if (!allowed) {
    return { error: MESSAGES.eventNotAuthorized };
  }

  return auth;
}

export async function requireCashierForEvent(
  eventId: string,
): Promise<AuthGuardResult> {
  return requireStaffForEvent(eventId, [ROLES.ADMIN, ROLES.CASHIER]);
}

export async function requireDoorForEvent(
  eventId: string,
): Promise<AuthGuardResult> {
  return requireStaffForEvent(eventId, [ROLES.ADMIN, ROLES.DOOR]);
}

/** @deprecated Usar requireAdmin() */
export const requireAdminAction = requireAdmin;

/** Cajero o admin sin validar evento (configuración global). */
export async function requireStaffKioskAction(): Promise<AuthGuardResult> {
  return requireInternalRole([ROLES.ADMIN, ROLES.CASHIER]);
}
