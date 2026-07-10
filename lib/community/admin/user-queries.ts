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
import {
  fetchAuthEmailsByIds,
  findAuthUserIdsByEmailSearch,
} from "@/lib/users/authEmails";

export const COMMUNITY_USERS_PAGE_SIZE = 25;
export const COMMUNITY_USERS_MAX_PAGE_SIZE = 50;

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
  current_level_id: string | null;
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
  pageSize?: number;
  levelId?: string;
  minBalance?: number;
  maxBalance?: number;
};

type QueryContext = {
  page: number;
  pageSize: number;
  from: number;
  to: number;
  filter: CommunityUsersFilter;
  sort: CommunityUsersSort;
  search: string;
  searchIds: string[] | null;
  levelId?: string;
  minBalance?: number;
  maxBalance?: number;
};

function emptyResult(page: number, pageSize: number): CommunityUsersPageResult {
  return {
    items: [],
    total: 0,
    page,
    pageSize,
    totalPages: 0,
  };
}

export function normalizeCommunityUsersPage(value?: number | string): number {
  const parsed = Number(value ?? 1);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
}

export function normalizeCommunityUsersPageSize(value?: number | string): number {
  const parsed = Number(value ?? COMMUNITY_USERS_PAGE_SIZE);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return COMMUNITY_USERS_PAGE_SIZE;
  }
  return Math.min(COMMUNITY_USERS_MAX_PAGE_SIZE, Math.floor(parsed));
}

export function normalizeCommunityUsersFilter(
  value?: string,
): CommunityUsersFilter {
  const values = Object.values(COMMUNITY_USERS_FILTER);
  if (value && values.includes(value as CommunityUsersFilter)) {
    return value as CommunityUsersFilter;
  }
  return COMMUNITY_USERS_FILTER.ALL;
}

export function normalizeCommunityUsersSort(value?: string): CommunityUsersSort {
  const values = Object.values(COMMUNITY_USERS_SORT);
  if (value && values.includes(value as CommunityUsersSort)) {
    return value as CommunityUsersSort;
  }
  return COMMUNITY_USERS_SORT.REGISTERED_DESC;
}

export function normalizeOptionalBalance(
  value?: number | string,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(0, Math.floor(parsed));
}

function confirmedTicket(row: TicketRow): boolean {
  return isConfirmedSale(row.ticket_status, row.payment_status);
}

function applySearchIds<T extends { in: (col: string, vals: string[]) => T }>(
  query: T,
  searchIds: string[] | null,
): T {
  if (searchIds && searchIds.length > 0) {
    return query.in("id", searchIds);
  }
  return query;
}

function applyMemberSearchIds<
  T extends { in: (col: string, vals: string[]) => T },
>(query: T, searchIds: string[] | null): T {
  if (searchIds && searchIds.length > 0) {
    return query.in("profile_id", searchIds);
  }
  return query;
}

async function resolveSearchProfileIds(
  admin: ReturnType<typeof createAdminClient>,
  search: string,
): Promise<string[] | null> {
  if (!search) {
    return null;
  }

  const term = `%${search}%`;
  const idSets: string[][] = [];

  const { data: byProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("role", ROLES.CUSTOMER)
    .or(`full_name.ilike.${term},whatsapp.ilike.${term}`);

  idSets.push((byProfile ?? []).map((row) => row.id));

  const { data: byDni } = await admin
    .from("community_members")
    .select("profile_id")
    .ilike("dni", term);

  idSets.push(
    (byDni ?? [])
      .map((row) => row.profile_id)
      .filter((id): id is string => Boolean(id)),
  );

  if (search.includes("@")) {
    const emailIds = await findAuthUserIdsByEmailSearch(search);
    idSets.push(emailIds);
  }

  return [...new Set(idSets.flat())];
}

async function loadTicketStatsForUsers(
  admin: ReturnType<typeof createAdminClient>,
  userIds: string[],
): Promise<
  Map<string, { purchases: number; attended: number; lastActivity: string | null }>
> {
  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await admin
    .from("tickets")
    .select("user_id, ticket_status, payment_status, used_at, event_id, created_at")
    .in("user_id", userIds);

  if (error) {
    console.error("loadTicketStatsForUsers:", error.message);
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
    [...map.entries()].map(([id, value]) => [
      id,
      {
        purchases: value.purchases,
        attended: value.attendedEvents.size,
        lastActivity: value.lastActivity,
      },
    ]),
  );
}

async function enrichPage(
  admin: ReturnType<typeof createAdminClient>,
  profiles: ProfileRow[],
  total: number,
  page: number,
  pageSize: number,
): Promise<CommunityUsersPageResult> {
  const userIds = profiles.map((profile) => profile.id);
  const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / pageSize));

  if (userIds.length === 0) {
    return {
      items: [],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  const [{ data: loyaltyRows }, { data: memberRows }, emailMap, ticketStats] =
    await Promise.all([
      admin
        .from("loyalty_accounts")
        .select("user_id, points_balance, updated_at, current_level_id")
        .in("user_id", userIds),
      admin
        .from("community_members")
        .select("profile_id, status, dni, whatsapp, created_at")
        .in("profile_id", userIds),
      fetchAuthEmailsByIds(userIds),
      loadTicketStatsForUsers(admin, userIds),
    ]);

  const loyaltyByUser = new Map(
    (loyaltyRows ?? []).map((row) => [row.user_id, row as LoyaltyRow]),
  );
  const memberByUser = new Map(
    (memberRows ?? []).map((row) => [row.profile_id, row as MemberRow]),
  );

  const items: CommunityUserListItem[] = profiles.map((profile) => {
    const loyalty = loyaltyByUser.get(profile.id);
    const member = memberByUser.get(profile.id);
    const tickets = ticketStats.get(profile.id);
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
      levelId: loyalty?.current_level_id ?? null,
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
}

async function getPositiveBalanceUserIds(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  const { data } = await admin
    .from("loyalty_accounts")
    .select("user_id")
    .gt("points_balance", 0);
  return (data ?? []).map((row) => row.user_id);
}

async function getConfirmedPurchaserIds(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  const { data } = await admin
    .from("tickets")
    .select("user_id")
    .not("user_id", "is", null)
    .in("ticket_status", [TICKET_STATUS.VALID, TICKET_STATUS.USED])
    .eq("payment_status", TICKET_PAYMENT_STATUS.CONFIRMED);

  return [...new Set((data ?? []).map((row) => row.user_id).filter(Boolean))] as string[];
}

async function getAttendeeUserIds(
  admin: ReturnType<typeof createAdminClient>,
): Promise<string[]> {
  const { data } = await admin
    .from("tickets")
    .select("user_id")
    .not("user_id", "is", null)
    .eq("ticket_status", TICKET_STATUS.USED)
    .eq("payment_status", TICKET_PAYMENT_STATUS.CONFIRMED);

  return [...new Set((data ?? []).map((row) => row.user_id).filter(Boolean))] as string[];
}

async function queryViaProfiles(
  admin: ReturnType<typeof createAdminClient>,
  ctx: QueryContext,
): Promise<CommunityUsersPageResult> {
  let query = admin
    .from("profiles")
    .select("id, full_name, whatsapp, created_at, is_active", { count: "exact" })
    .eq("role", ROLES.CUSTOMER);

  query = applySearchIds(query, ctx.searchIds);

  if (ctx.filter === COMMUNITY_USERS_FILTER.RECENT) {
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - RECENT_DAYS);
    query = query.gte("created_at", recentCutoff.toISOString());
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.ACTIVE) {
    query = query.eq("is_active", true);
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.INACTIVE) {
    query = query.eq("is_active", false);
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.WITHOUT_POINTS) {
    const withPoints = await getPositiveBalanceUserIds(admin);
    if (withPoints.length > 0) {
      query = query.not("id", "in", `(${withPoints.join(",")})`);
    }
  }

  if (
    ctx.filter === COMMUNITY_USERS_FILTER.WITH_PURCHASES ||
    ctx.filter === COMMUNITY_USERS_FILTER.WITHOUT_PURCHASES
  ) {
    const purchaserIds = await getConfirmedPurchaserIds(admin);
    if (ctx.filter === COMMUNITY_USERS_FILTER.WITH_PURCHASES) {
      if (purchaserIds.length === 0) {
        return emptyResult(ctx.page, ctx.pageSize);
      }
      query = query.in("id", purchaserIds);
    } else if (purchaserIds.length > 0) {
      query = query.not("id", "in", `(${purchaserIds.join(",")})`);
    }
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.WITH_ATTENDANCE) {
    const attendeeIds = await getAttendeeUserIds(admin);
    if (attendeeIds.length === 0) {
      return emptyResult(ctx.page, ctx.pageSize);
    }
    query = query.in("id", attendeeIds);
  }

  switch (ctx.sort) {
    case COMMUNITY_USERS_SORT.NAME_ASC:
      query = query.order("full_name", { ascending: true, nullsFirst: false });
      break;
    case COMMUNITY_USERS_SORT.REGISTERED_ASC:
      query = query.order("created_at", { ascending: true });
      break;
    case COMMUNITY_USERS_SORT.REGISTERED_DESC:
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  const { data, count, error } = await query.range(ctx.from, ctx.to);

  if (error) {
    console.error("queryViaProfiles:", error.message);
    return emptyResult(ctx.page, ctx.pageSize);
  }

  return enrichPage(
    admin,
    (data ?? []) as ProfileRow[],
    count ?? 0,
    ctx.page,
    ctx.pageSize,
  );
}

async function queryViaLoyalty(
  admin: ReturnType<typeof createAdminClient>,
  ctx: QueryContext,
): Promise<CommunityUsersPageResult> {
  let query = admin
    .from("loyalty_accounts")
    .select(
      `
      user_id,
      points_balance,
      updated_at,
      current_level_id,
      profiles!inner (
        id,
        full_name,
        whatsapp,
        created_at,
        is_active,
        role
      )
    `,
      { count: "exact" },
    )
    .eq("profiles.role", ROLES.CUSTOMER);

  if (ctx.searchIds) {
    query = query.in("user_id", ctx.searchIds);
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.WITH_POINTS) {
    query = query.gt("points_balance", 0);
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.WITHOUT_POINTS) {
    query = query.lte("points_balance", 0);
  }

  if (ctx.levelId) {
    query = query.eq("current_level_id", ctx.levelId);
  }

  if (ctx.minBalance !== undefined) {
    query = query.gte("points_balance", ctx.minBalance);
  }

  if (ctx.maxBalance !== undefined) {
    query = query.lte("points_balance", ctx.maxBalance);
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.ACTIVE) {
    query = query.eq("profiles.is_active", true);
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.INACTIVE) {
    query = query.eq("profiles.is_active", false);
  }

  switch (ctx.sort) {
    case COMMUNITY_USERS_SORT.POINTS_ASC:
      query = query.order("points_balance", { ascending: true });
      break;
    case COMMUNITY_USERS_SORT.ACTIVITY_DESC:
      query = query.order("updated_at", { ascending: false });
      break;
    case COMMUNITY_USERS_SORT.POINTS_DESC:
    default:
      query = query.order("points_balance", { ascending: false });
      break;
  }

  const { data, count, error } = await query.range(ctx.from, ctx.to);

  if (error) {
    console.error("queryViaLoyalty:", error.message);
    return emptyResult(ctx.page, ctx.pageSize);
  }

  const profiles = (data ?? []).map((row) => {
    const profile = row.profiles as unknown as ProfileRow;
    return profile;
  });

  return enrichPage(admin, profiles, count ?? 0, ctx.page, ctx.pageSize);
}

async function queryViaMembers(
  admin: ReturnType<typeof createAdminClient>,
  ctx: QueryContext,
): Promise<CommunityUsersPageResult> {
  let query = admin
    .from("community_members")
    .select(
      `
      profile_id,
      status,
      dni,
      whatsapp,
      created_at,
      profiles!inner (
        id,
        full_name,
        whatsapp,
        created_at,
        is_active,
        role
      )
    `,
      { count: "exact" },
    )
    .eq("profiles.role", ROLES.CUSTOMER);

  query = applyMemberSearchIds(query, ctx.searchIds);

  if (ctx.filter === COMMUNITY_USERS_FILTER.ACTIVE) {
    query = query
      .eq("status", "active")
      .eq("profiles.is_active", true);
  }

  if (ctx.filter === COMMUNITY_USERS_FILTER.INACTIVE) {
    query = query.or("status.eq.inactive,status.eq.suspended,status.eq.disabled");
  }

  query = query.order("created_at", { ascending: false });

  const { data, count, error } = await query.range(ctx.from, ctx.to);

  if (error) {
    console.error("queryViaMembers:", error.message);
    return emptyResult(ctx.page, ctx.pageSize);
  }

  const profiles = (data ?? []).map(
    (row) => row.profiles as unknown as ProfileRow,
  );

  return enrichPage(admin, profiles, count ?? 0, ctx.page, ctx.pageSize);
}

async function queryViaPurchaseSort(
  admin: ReturnType<typeof createAdminClient>,
  ctx: QueryContext,
): Promise<CommunityUsersPageResult> {
  const purchaserIds = await getConfirmedPurchaserIds(admin);
  const ticketStats = await loadTicketStatsForUsers(admin, purchaserIds);

  const sortedPurchasers = purchaserIds
    .filter((id) => !ctx.searchIds || ctx.searchIds.includes(id))
    .sort((a, b) => {
      const purchasesA = ticketStats.get(a)?.purchases ?? 0;
      const purchasesB = ticketStats.get(b)?.purchases ?? 0;
      if (purchasesB !== purchasesA) {
        return purchasesB - purchasesA;
      }
      return a.localeCompare(b);
    });

  const buildNonPurchaserQuery = () => {
    let query = admin
      .from("profiles")
      .select("id, full_name, whatsapp, created_at, is_active", { count: "exact" })
      .eq("role", ROLES.CUSTOMER);

    query = applySearchIds(query, ctx.searchIds);

    if (ctx.filter === COMMUNITY_USERS_FILTER.ACTIVE) {
      query = query.eq("is_active", true);
    }
    if (ctx.filter === COMMUNITY_USERS_FILTER.INACTIVE) {
      query = query.eq("is_active", false);
    }
    if (sortedPurchasers.length > 0) {
      query = query.not("id", "in", `(${sortedPurchasers.join(",")})`);
    }
    return query;
  };

  const { count: nonPurchaserCount } = await buildNonPurchaserQuery();

  const total = sortedPurchasers.length + (nonPurchaserCount ?? 0);

  if (total === 0) {
    return emptyResult(ctx.page, ctx.pageSize);
  }

  const pageProfiles: ProfileRow[] = [];

  if (ctx.from < sortedPurchasers.length) {
    const purchaserSlice = sortedPurchasers.slice(
      ctx.from,
      Math.min(ctx.to + 1, sortedPurchasers.length),
    );
    if (purchaserSlice.length > 0) {
      const { data } = await admin
        .from("profiles")
        .select("id, full_name, whatsapp, created_at, is_active")
        .in("id", purchaserSlice);
      const byId = new Map(
        ((data ?? []) as ProfileRow[]).map((row) => [row.id, row]),
      );
      for (const id of purchaserSlice) {
        const row = byId.get(id);
        if (row) {
          pageProfiles.push(row);
        }
      }
    }
  }

  if (pageProfiles.length < ctx.pageSize && ctx.to >= sortedPurchasers.length) {
    const nonPurchaserFrom = Math.max(0, ctx.from - sortedPurchasers.length);
    const nonPurchaserTo =
      nonPurchaserFrom + (ctx.pageSize - pageProfiles.length) - 1;

    const { data: nonPurchasers } = await buildNonPurchaserQuery()
      .order("created_at", { ascending: false })
      .range(nonPurchaserFrom, nonPurchaserTo);

    pageProfiles.push(...((nonPurchasers ?? []) as ProfileRow[]));
  }

  return enrichPage(admin, pageProfiles, total, ctx.page, ctx.pageSize);
}

function resolveStrategy(
  filter: CommunityUsersFilter,
  sort: CommunityUsersSort,
  levelId?: string,
  minBalance?: number,
  maxBalance?: number,
): "profiles" | "loyalty" | "members" | "purchase_sort" {
  if (sort === COMMUNITY_USERS_SORT.PURCHASES_DESC) {
    return "purchase_sort";
  }

  if (
    filter === COMMUNITY_USERS_FILTER.WITH_POINTS ||
    filter === COMMUNITY_USERS_FILTER.WITHOUT_POINTS ||
    sort === COMMUNITY_USERS_SORT.POINTS_DESC ||
    sort === COMMUNITY_USERS_SORT.POINTS_ASC ||
    sort === COMMUNITY_USERS_SORT.ACTIVITY_DESC ||
    levelId ||
    minBalance !== undefined ||
    maxBalance !== undefined
  ) {
    return "loyalty";
  }

  if (
    filter === COMMUNITY_USERS_FILTER.ACTIVE ||
    filter === COMMUNITY_USERS_FILTER.INACTIVE
  ) {
    return "members";
  }

  return "profiles";
}

export async function getCommunityLevelsForAdmin(): Promise<
  Array<{ id: string; name: string }>
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_levels")
    .select("id, name")
    .order("minimum_lifetime_points", { ascending: true });

  if (error) {
    console.error("getCommunityLevelsForAdmin:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Listado paginado de usuarios de comunidad.
 *
 * Consultas por carga (típico):
 * - 0–2 previas de búsqueda (perfiles / miembros / auth email)
 * - 1 paginada principal (perfiles, loyalty o members)
 * - 4 enriquecimiento en paralelo para la página actual (loyalty, members, emails, tickets)
 *
 * Máximo de filas de perfiles recuperadas: pageSize (25 por defecto, tope 50).
 */
export async function searchCommunityUsers(
  params: CommunityUsersQueryParams = {},
): Promise<CommunityUsersPageResult> {
  const admin = createAdminClient();
  const pageSize = normalizeCommunityUsersPageSize(params.pageSize);
  const page = normalizeCommunityUsersPage(params.page);
  const filter = normalizeCommunityUsersFilter(params.filter);
  const sort = normalizeCommunityUsersSort(params.sort);
  const search = params.search?.trim() ?? "";
  const levelId = params.levelId?.trim() || undefined;
  const minBalance = normalizeOptionalBalance(params.minBalance);
  const maxBalance = normalizeOptionalBalance(params.maxBalance);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const searchIds = await resolveSearchProfileIds(admin, search);
  if (searchIds && searchIds.length === 0) {
    return emptyResult(page, pageSize);
  }

  const ctx: QueryContext = {
    page,
    pageSize,
    from,
    to,
    filter,
    sort,
    search,
    searchIds,
    levelId,
    minBalance,
    maxBalance,
  };

  const strategy = resolveStrategy(filter, sort, levelId, minBalance, maxBalance);

  switch (strategy) {
    case "loyalty":
      return queryViaLoyalty(admin, ctx);
    case "members":
      return queryViaMembers(admin, ctx);
    case "purchase_sort":
      return queryViaPurchaseSort(admin, ctx);
    case "profiles":
    default:
      return queryViaProfiles(admin, ctx);
  }
}
