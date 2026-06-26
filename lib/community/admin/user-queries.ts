import { createAdminClient } from "@/lib/supabase/admin";
import { ROLES } from "@/lib/constants/roles";
import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
} from "@/lib/ticket-sales/types";
import { isConfirmedSale } from "@/lib/ticket-sales/saleStatus";
import type {
  CommunityUserListItem,
  CommunityUsersFilter,
  CommunityUsersPageResult,
  CommunityUsersSort,
} from "@/lib/community/admin/types";
import {
  COMMUNITY_USERS_FILTER,
  COMMUNITY_USERS_SORT,
} from "@/lib/community/admin/types";
import { fetchAuthEmailsByIds } from "@/lib/users/authEmails";

const PAGE_SIZE = 25;
const RECENT_DAYS = 30;

type ProfileRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  created_at: string;
  is_active: boolean;
};

type LoyaltyRow = {
  user_id: string;
  points_balance: number;
  updated_at: string;
};

type MemberRow = {
  profile_id: string;
  status: string;
  dni: string | null;
  whatsapp: string | null;
  created_at: string;
};

type TicketRow = {
  user_id: string | null;
  price_paid: number | null;
  ticket_status: string;
  payment_status: string;
  used_at: string | null;
  event_id: string;
  created_at: string;
};

export type CommunityUsersQueryParams = {
  search?: string;
  filter?: CommunityUsersFilter;
  sort?: CommunityUsersSort;
  page?: number;
};

function confirmedTicket(row: TicketRow): boolean {
  return isConfirmedSale(row.ticket_status, row.payment_status);
}

async function loadTicketAggregates(
  admin: ReturnType<typeof createAdminClient>,
): Promise<Map<string, { purchases: number; attended: number; lastActivity: string | null }>> {
  const { data, error } = await admin
    .from("tickets")
    .select(
      "user_id, price_paid, ticket_status, payment_status, used_at, event_id, created_at",
    )
    .not("user_id", "is", null);

  if (error) {
    console.error("loadTicketAggregates:", error.message);
    return new Map();
  }

  const map = new Map<
    string,
    {
      purchases: number;
      attendedEvents: Set<string>;
      lastActivity: string | null;
    }
  >();

  for (const row of (data ?? []) as TicketRow[]) {
    if (!row.user_id) {
      continue;
    }
    const entry = map.get(row.user_id) ?? {
      purchases: 0,
      attendedEvents: new Set<string>(),
      lastActivity: null,
    };

    if (confirmedTicket(row)) {
      entry.purchases += 1;
      const candidate = row.used_at ?? row.created_at;
      if (!entry.lastActivity || candidate > entry.lastActivity) {
        entry.lastActivity = candidate;
      }
    }

    if (
      row.ticket_status === TICKET_STATUS.USED &&
      row.payment_status === TICKET_PAYMENT_STATUS.CONFIRMED
    ) {
      entry.attendedEvents.add(row.event_id);
      if (row.used_at && (!entry.lastActivity || row.used_at > entry.lastActivity)) {
        entry.lastActivity = row.used_at;
      }
    }

    map.set(row.user_id, entry);
  }

  return new Map(
    [...map.entries()].map(([id, v]) => [
      id,
      {
        purchases: v.purchases,
        attended: v.attendedEvents.size,
        lastActivity: v.lastActivity,
      },
    ]),
  );
}

function matchesSearch(
  row: ProfileRow,
  member: MemberRow | undefined,
  email: string | null,
  term: string,
): boolean {
  const q = term.toLowerCase();
  return (
    row.full_name?.toLowerCase().includes(q) ||
    email?.toLowerCase().includes(q) ||
    row.whatsapp?.toLowerCase().includes(q) ||
    member?.whatsapp?.toLowerCase().includes(q) ||
    member?.dni?.toLowerCase().includes(q) ||
    false
  );
}

function passesFilter(
  profile: ProfileRow,
  member: MemberRow | undefined,
  loyalty: LoyaltyRow | undefined,
  ticketStats: { purchases: number; attended: number } | undefined,
  filter: CommunityUsersFilter,
): boolean {
  const points = loyalty?.points_balance ?? 0;
  const purchases = ticketStats?.purchases ?? 0;
  const attended = ticketStats?.attended ?? 0;
  const status = member?.status ?? "active";
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - RECENT_DAYS);

  switch (filter) {
    case COMMUNITY_USERS_FILTER.WITH_POINTS:
      return points > 0;
    case COMMUNITY_USERS_FILTER.WITHOUT_POINTS:
      return points <= 0;
    case COMMUNITY_USERS_FILTER.WITH_PURCHASES:
      return purchases > 0;
    case COMMUNITY_USERS_FILTER.WITHOUT_PURCHASES:
      return purchases === 0;
    case COMMUNITY_USERS_FILTER.WITH_ATTENDANCE:
      return attended > 0;
    case COMMUNITY_USERS_FILTER.RECENT:
      return new Date(profile.created_at) >= recentCutoff;
    case COMMUNITY_USERS_FILTER.ACTIVE:
      return profile.is_active && status !== "inactive" && status !== "suspended";
    case COMMUNITY_USERS_FILTER.INACTIVE:
      return !profile.is_active || status === "inactive" || status === "suspended";
    default:
      return true;
  }
}

export async function searchCommunityUsers(
  params: CommunityUsersQueryParams,
): Promise<CommunityUsersPageResult> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const filter = params.filter ?? COMMUNITY_USERS_FILTER.ALL;
  const sort = params.sort ?? COMMUNITY_USERS_SORT.REGISTERED_DESC;
  const search = params.search?.trim() ?? "";

  const [
    { data: profiles, error: profilesError },
    { data: loyaltyRows },
    { data: memberRows },
    ticketAggregates,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, whatsapp, created_at, is_active")
      .eq("role", ROLES.CUSTOMER)
      .order("created_at", { ascending: false }),
    admin.from("loyalty_accounts").select("user_id, points_balance, updated_at"),
    admin
      .from("community_members")
      .select("profile_id, status, dni, whatsapp, created_at"),
    loadTicketAggregates(admin),
  ]);

  if (profilesError) {
    console.error("searchCommunityUsers profiles:", profilesError.message);
    return { items: [], total: 0, page, pageSize: PAGE_SIZE, totalPages: 0 };
  }

  const loyaltyByUser = new Map(
    (loyaltyRows ?? []).map((r) => [r.user_id, r as LoyaltyRow]),
  );
  const memberByUser = new Map(
    (memberRows ?? []).map((r) => [r.profile_id, r as MemberRow]),
  );

  const profileList = (profiles ?? []) as ProfileRow[];
  const emailMap = await fetchAuthEmailsByIds(profileList.map((p) => p.id));

  const candidates = profileList.filter((profile) => {
    const member = memberByUser.get(profile.id);
    const email = emailMap.get(profile.id) ?? null;
    if (search && !matchesSearch(profile, member, email, search)) {
      return false;
    }
    const loyalty = loyaltyByUser.get(profile.id);
    const tickets = ticketAggregates.get(profile.id);
    return passesFilter(profile, member, loyalty, tickets, filter);
  });

  candidates.sort((a, b) => {
    const loyaltyA = loyaltyByUser.get(a.id);
    const loyaltyB = loyaltyByUser.get(b.id);
    const ticketsA = ticketAggregates.get(a.id);
    const ticketsB = ticketAggregates.get(b.id);
    const memberA = memberByUser.get(a.id);
    const memberB = memberByUser.get(b.id);

    const activityA =
      ticketsA?.lastActivity ??
      loyaltyA?.updated_at ??
      memberA?.created_at ??
      a.created_at;
    const activityB =
      ticketsB?.lastActivity ??
      loyaltyB?.updated_at ??
      memberB?.created_at ??
      b.created_at;

    switch (sort) {
      case COMMUNITY_USERS_SORT.NAME_ASC:
        return (a.full_name ?? "").localeCompare(b.full_name ?? "", "es");
      case COMMUNITY_USERS_SORT.POINTS_DESC:
        return (loyaltyB?.points_balance ?? 0) - (loyaltyA?.points_balance ?? 0);
      case COMMUNITY_USERS_SORT.PURCHASES_DESC:
        return (ticketsB?.purchases ?? 0) - (ticketsA?.purchases ?? 0);
      case COMMUNITY_USERS_SORT.ACTIVITY_DESC:
        return activityB.localeCompare(activityA);
      case COMMUNITY_USERS_SORT.REGISTERED_DESC:
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });

  const total = candidates.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = candidates.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const items: CommunityUserListItem[] = slice.map((profile) => {
    const loyalty = loyaltyByUser.get(profile.id);
    const member = memberByUser.get(profile.id);
    const tickets = ticketAggregates.get(profile.id);
    const lastActivity =
      tickets?.lastActivity ??
      loyalty?.updated_at ??
      member?.created_at ??
      profile.created_at;

    return {
      userId: profile.id,
      fullName: profile.full_name,
      email: emailMap.get(profile.id) ?? null,
      whatsapp: member?.whatsapp ?? profile.whatsapp,
      dni: member?.dni ?? null,
      registeredAt: member?.created_at ?? profile.created_at,
      pointsBalance: loyalty?.points_balance ?? 0,
      purchaseCount: tickets?.purchases ?? 0,
      eventsAttended: tickets?.attended ?? 0,
      lastActivity,
      status: member?.status ?? "active",
      isActive: profile.is_active,
    };
  });

  return {
    items,
    total,
    page: safePage,
    pageSize: PAGE_SIZE,
    totalPages: total === 0 ? 0 : totalPages,
  };
}
