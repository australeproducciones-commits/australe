import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/types";
import { ROLES } from "@/lib/constants/roles";
import type {
  AssignedEventSummary,
  InternalRole,
  InternalUserListItem,
  InternalUsersSummary,
} from "@/lib/users/types";
import { isInternalRole, eventStaffRoleFromProfileRole } from "@/lib/users/types";

type ProfileStaffRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  role: string;
  is_active: boolean;
  staff_all_events: boolean;
  created_at: string;
  updated_at: string;
};

export type InternalUsersFilters = {
  search?: string;
  role?: string;
  status?: "active" | "inactive" | "all";
  eventId?: string;
};

export type StaffAccessibleEvent = {
  id: string;
  name: string;
  event_date: string | null;
  status: string;
};

export async function getStaffAccessibleEvents(
  profile: Profile,
  options?: {
    staffRole?: typeof ROLES.CASHIER | typeof ROLES.DOOR;
  },
): Promise<StaffAccessibleEvent[]> {
  if (!profile.is_active) {
    return [];
  }

  const supabase = await createClient();
  const eventColumns = "id, name, event_date, status";

  if (profile.role === ROLES.ADMIN) {
    const { data, error } = await supabase
      .from("events")
      .select(eventColumns)
      .order("event_date", { ascending: false });

    if (error) {
      console.error("getStaffAccessibleEvents admin:", error);
      return [];
    }

    return data ?? [];
  }

  const staffRole = options?.staffRole ?? profile.role;
  if (staffRole !== ROLES.CASHIER && staffRole !== ROLES.DOOR) {
    return [];
  }

  if (profile.role !== staffRole) {
    return [];
  }

  if (profile.staff_all_events) {
    const { data, error } = await supabase
      .from("events")
      .select(eventColumns)
      .order("event_date", { ascending: false });

    if (error) {
      console.error("getStaffAccessibleEvents global:", error);
      return [];
    }

    return data ?? [];
  }

  const { data, error } = await supabase
    .from("event_staff")
    .select(`event_id, events (${eventColumns})`)
    .eq("user_id", profile.id)
    .eq("role", staffRole)
    .eq("is_active", true);

  if (error) {
    console.error("getStaffAccessibleEvents assignments:", error);
    return [];
  }

  const events = (data ?? [])
    .map((row) => {
      const event = Array.isArray(row.events) ? row.events[0] : row.events;
      if (!event) {
        return null;
      }

      return event as StaffAccessibleEvent;
    })
    .filter((event): event is StaffAccessibleEvent => event != null)
    .sort((left, right) =>
      (right.event_date ?? "").localeCompare(left.event_date ?? ""),
    );

  return events;
}

export async function getStaffAccessibleEventById(
  profile: Profile,
  eventId: string,
  options?: {
    staffRole?: typeof ROLES.CASHIER | typeof ROLES.DOOR;
  },
): Promise<StaffAccessibleEvent | null> {
  const events = await getStaffAccessibleEvents(profile, options);
  return events.find((event) => event.id === eventId) ?? null;
}

export async function getInternalUsersForAdmin(
  filters: InternalUsersFilters = {},
): Promise<InternalUserListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(
      "id, full_name, whatsapp, role, is_active, staff_all_events, created_at, updated_at",
    )
    .in("role", [ROLES.ADMIN, ROLES.CASHIER, ROLES.DOOR])
    .order("full_name", { ascending: true });

  if (filters.role && filters.role !== "all") {
    query = query.eq("role", filters.role);
  }

  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data: profiles, error } = await query;

  if (error) {
    console.error("getInternalUsersForAdmin:", error);
    throw new Error("No se pudieron cargar los usuarios internos.");
  }

  const rows = (profiles ?? []) as ProfileStaffRow[];
  const userIds = rows.map((row) => row.id);

  const { data: assignments } = await supabase
    .from("event_staff")
    .select("id, event_id, user_id, role, is_active, assigned_at")
    .in(
      "user_id",
      userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"],
    );

  const assignmentRows = assignments ?? [];
  const eventIds = [...new Set(assignmentRows.map((row) => row.event_id))];

  const { data: eventRows } =
    eventIds.length > 0
      ? await supabase
          .from("events")
          .select("id, name, event_date")
          .in("id", eventIds)
      : { data: [] };

  const eventMap = new Map(
    (eventRows ?? []).map((event) => [event.id, event]),
  );

  const assignmentsByUser = new Map<string, AssignedEventSummary[]>();

  for (const row of assignmentRows) {
    if (!isInternalRole(row.role)) {
      continue;
    }

    const staffRole = eventStaffRoleFromProfileRole(row.role);
    if (!staffRole) {
      continue;
    }

    const event = eventMap.get(row.event_id);
    const list = assignmentsByUser.get(row.user_id) ?? [];
    list.push({
      id: row.id,
      event_id: row.event_id,
      event_name: event?.name ?? "Evento",
      event_date: event?.event_date ?? "",
      role: staffRole,
      is_active: row.is_active,
    });
    assignmentsByUser.set(row.user_id, list);
  }

  const emailMap = await fetchAuthEmailsByIds(userIds);

  let items: InternalUserListItem[] = rows
    .filter((row): row is ProfileStaffRow & { role: InternalRole } =>
      isInternalRole(row.role),
    )
    .map((row) => ({
      ...row,
      role: row.role,
      email: emailMap.get(row.id) ?? null,
      last_sign_in_at: null,
      assigned_events: assignmentsByUser.get(row.id) ?? [],
    }));

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.full_name?.toLowerCase().includes(term) ||
        item.email?.toLowerCase().includes(term) ||
        item.whatsapp?.toLowerCase().includes(term),
    );
  }

  if (filters.eventId) {
    items = items.filter((item) =>
      item.staff_all_events
        ? item.role === ROLES.ADMIN
        : item.assigned_events.some(
            (event) => event.event_id === filters.eventId && event.is_active,
          ),
    );
  }

  return items;
}

export async function getInternalUsersSummary(): Promise<InternalUsersSummary> {
  const users = await getInternalUsersForAdmin();

  return {
    total: users.length,
    admins: users.filter((user) => user.role === ROLES.ADMIN).length,
    door: users.filter((user) => user.role === ROLES.DOOR).length,
    cashiers: users.filter((user) => user.role === ROLES.CASHIER).length,
    inactive: users.filter((user) => !user.is_active).length,
  };
}

export async function getInternalUserById(
  userId: string,
): Promise<InternalUserListItem | null> {
  const users = await getInternalUsersForAdmin();
  return users.find((user) => user.id === userId) ?? null;
}

export async function getEventsForStaffAssignment() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, name, event_date, status")
    .order("event_date", { ascending: false });

  if (error) {
    console.error("getEventsForStaffAssignment:", error);
    return [];
  }

  return data ?? [];
}

async function fetchAuthEmailsByIds(
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();

  if (userIds.length === 0) {
    return map;
  }

  try {
    const admin = createAdminClient();
    const idSet = new Set(userIds);

    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });

      if (error) {
        console.error("fetchAuthEmailsByIds:", error);
        break;
      }

      for (const user of data.users) {
        if (idSet.has(user.id) && user.email) {
          map.set(user.id, user.email);
        }
      }

      if (data.users.length < perPage) {
        break;
      }

      page += 1;
      if (page > 20) {
        break;
      }
    }
  } catch (error) {
    console.error("fetchAuthEmailsByIds:", error);
  }

  return map;
}

export async function countActiveAdmins(): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", ROLES.ADMIN)
    .eq("is_active", true);

  if (error) {
    console.error("countActiveAdmins:", error);
    return 0;
  }

  return count ?? 0;
}
