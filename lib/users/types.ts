import { ROLES } from "@/lib/constants/roles";

export const INTERNAL_ROLES = [ROLES.ADMIN, ROLES.CASHIER, ROLES.DOOR] as const;

export type InternalRole = (typeof INTERNAL_ROLES)[number];

export type EventStaffRole = typeof ROLES.CASHIER | typeof ROLES.DOOR;

export type InternalUserProfile = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  role: InternalRole;
  is_active: boolean;
  staff_all_events: boolean;
  created_at: string;
  updated_at: string;
};

export type InternalUserListItem = InternalUserProfile & {
  email: string | null;
  last_sign_in_at: string | null;
  assigned_events: AssignedEventSummary[];
};

export type AssignedEventSummary = {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string | null;
  role: EventStaffRole;
  is_active: boolean;
};

export type InternalUsersSummary = {
  total: number;
  admins: number;
  door: number;
  cashiers: number;
  inactive: number;
};

export type InternalUserFormInput = {
  full_name: string;
  email: string;
  whatsapp: string;
  role: InternalRole;
  is_active: boolean;
  staff_all_events: boolean;
  event_ids: string[];
};

export type UserActionResult =
  | { ok: true; userId?: string }
  | { ok: false; message: string };

export function isInternalRole(role: string): role is InternalRole {
  return (
    role === ROLES.ADMIN ||
    role === ROLES.CASHIER ||
    role === ROLES.DOOR
  );
}

export function eventStaffRoleFromProfileRole(
  role: InternalRole,
): EventStaffRole | null {
  if (role === ROLES.CASHIER || role === ROLES.DOOR) {
    return role;
  }
  return null;
}
