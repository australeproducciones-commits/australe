import { createAdminClient } from "@/lib/supabase/admin";
import { withQueryTimeout } from "@/lib/supabase/queryTimeout";
import type {
  AdminCommunityMember,
  AdminCommunitySummary,
  CommunityReward,
  CommunitySettings,
  InvitationStatusCounts,
  LoyaltyTransaction,
} from "@/lib/community/loyalty/types";

type AggregateSumRow = { sum: number | string | null };

function readAggregateSum(data: AggregateSumRow | AggregateSumRow[] | null): number {
  const row = Array.isArray(data) ? data[0] : data;
  return Number(row?.sum ?? 0);
}

async function sumLoyaltyTransactionPoints(
  admin: ReturnType<typeof createAdminClient>,
  transactionType: "earn" | "redeem",
): Promise<number> {
  try {
    const { data, error } = await withQueryTimeout(
      `adminSumLoyaltyPoints:${transactionType}`,
      (signal) =>
        admin
          .from("loyalty_transactions")
          .select("points.sum()")
          .eq("transaction_type", transactionType)
          .abortSignal(signal),
    );

    if (error) {
      console.error(`sumLoyaltyTransactionPoints(${transactionType}):`, error.message);
      return 0;
    }

    const total = readAggregateSum(data as AggregateSumRow[] | null);
    return transactionType === "redeem" ? Math.abs(total) : total;
  } catch (error) {
    console.error(`sumLoyaltyTransactionPoints(${transactionType}):`, error);
    return 0;
  }
}

async function sumLoyaltyPointsInCirculation(
  admin: ReturnType<typeof createAdminClient>,
): Promise<number> {
  try {
    const { data, error } = await withQueryTimeout(
      "adminSumLoyaltyBalances",
      (signal) =>
        admin
          .from("loyalty_accounts")
          .select("points_balance.sum()")
          .abortSignal(signal),
    );

    if (error) {
      console.error("sumLoyaltyPointsInCirculation:", error.message);
      return 0;
    }

    return readAggregateSum(data as AggregateSumRow[] | null);
  } catch (error) {
    console.error("sumLoyaltyPointsInCirculation:", error);
    return 0;
  }
}

async function countInvitations(
  admin: ReturnType<typeof createAdminClient>,
  statuses: string[],
): Promise<number> {
  if (statuses.length === 0) {
    return 0;
  }

  try {
    const { count, error } = await withQueryTimeout(
      `adminInvitationCount:${statuses.join(",")}`,
      (signal) =>
        admin
          .from("community_event_invitations")
          .select("id", { count: "exact", head: true })
          .in("status", statuses)
          .abortSignal(signal),
    );

    if (error) {
      console.error("countInvitations:", error.message);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error("countInvitations:", error);
    return 0;
  }
}

async function getInvitationStatusCounts(
  admin: ReturnType<typeof createAdminClient>,
): Promise<InvitationStatusCounts> {
  try {
    const [pending, opened, accepted, used, expired, cancelled, total] =
      await Promise.all([
        countInvitations(admin, ["prepared", "sent", "draft"]),
        countInvitations(admin, ["opened"]),
        countInvitations(admin, ["accepted"]),
        countInvitations(admin, ["used"]),
        countInvitations(admin, ["expired"]),
        countInvitations(admin, ["cancelled"]),
        safeAdminCount("adminInvitationTotal", (signal) =>
          admin
            .from("community_event_invitations")
            .select("id", { count: "exact", head: true })
            .abortSignal(signal),
        ),
      ]);

    return {
      pending,
      opened,
      accepted,
      used,
      expired,
      cancelled,
      total,
    };
  } catch {
    return {
      pending: 0,
      opened: 0,
      accepted: 0,
      used: 0,
      expired: 0,
      cancelled: 0,
      total: 0,
    };
  }
}

async function safeAdminCount(
  operation: string,
  run: (
    signal: AbortSignal,
  ) => PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  try {
    const { count, error } = await withQueryTimeout(operation, run);
    if (error) {
      console.error(`${operation}:`, error.message);
      return 0;
    }
    return count ?? 0;
  } catch (error) {
    console.error(`${operation}:`, error);
    return 0;
  }
}

export async function getAdminCommunitySummary(): Promise<AdminCommunitySummary> {
  const admin = createAdminClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const recentCutoffIso = recentCutoff.toISOString();

  const [
    activeMembers,
    newMembersThisMonth,
    pointsIssued,
    pointsRedeemed,
    pendingRedemptions,
    activeRewards,
    totalRegisteredUsers,
    recentActiveUsers,
    pointsInCirculation,
    completedRedemptions,
    invitationCounts,
    activeAdvertisingCampaigns,
  ] = await Promise.all([
    safeAdminCount("adminActiveMembers", (signal) =>
      admin
        .from("loyalty_accounts")
        .select("user_id", { count: "exact", head: true })
        .gt("lifetime_points", 0)
        .abortSignal(signal),
    ),
    safeAdminCount("adminNewMembersThisMonth", (signal) =>
      admin
        .from("loyalty_accounts")
        .select("user_id", { count: "exact", head: true })
        .gte("updated_at", monthStartIso)
        .abortSignal(signal),
    ),
    sumLoyaltyTransactionPoints(admin, "earn"),
    sumLoyaltyTransactionPoints(admin, "redeem"),
    safeAdminCount("adminPendingRedemptions", (signal) =>
      admin
        .from("community_redemptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .abortSignal(signal),
    ),
    safeAdminCount("adminActiveRewards", (signal) =>
      admin
        .from("community_rewards")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .abortSignal(signal),
    ),
    safeAdminCount("adminRegisteredCustomers", (signal) =>
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer")
        .abortSignal(signal),
    ),
    safeAdminCount("adminRecentActiveUsers", (signal) =>
      admin
        .from("loyalty_accounts")
        .select("user_id", { count: "exact", head: true })
        .gte("updated_at", recentCutoffIso)
        .abortSignal(signal),
    ),
    sumLoyaltyPointsInCirculation(admin),
    safeAdminCount("adminCompletedRedemptions", (signal) =>
      admin
        .from("community_redemptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["approved", "used"])
        .abortSignal(signal),
    ),
    getInvitationStatusCounts(admin),
    safeAdminCount("adminActiveAdvertising", (signal) =>
      admin
        .from("advertising_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .abortSignal(signal),
    ),
  ]);

  return {
    activeMembers,
    newMembersThisMonth,
    pointsIssued,
    pointsRedeemed,
    pendingRedemptions,
    activeRewards,
    totalRegisteredUsers,
    recentActiveUsers,
    pointsInCirculation,
    completedRedemptions,
    invitationsSent: invitationCounts.total,
    invitationsOpened: invitationCounts.opened,
    invitationsPending: invitationCounts.pending,
    invitationsAccepted: invitationCounts.accepted,
    invitationsUsed: invitationCounts.used,
    invitationsExpired: invitationCounts.expired,
    activeAdvertisingCampaigns,
  };
}

export async function getAdminCommunityMembers(): Promise<AdminCommunityMember[]> {
  const admin = createAdminClient();

  const { data: accounts, error } = await admin
    .from("loyalty_accounts")
    .select("user_id, points_balance, lifetime_points, current_level_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getAdminCommunityMembers:", error.message);
    return [];
  }

  const userIds = (accounts ?? []).map((a) => a.user_id);
  const levelIds = [
    ...new Set(
      (accounts ?? [])
        .map((a) => a.current_level_id)
        .filter((id): id is string => id !== null),
    ),
  ];

  const emptyId = "00000000-0000-0000-0000-000000000000";
  const queryIds = userIds.length ? userIds : [emptyId];

  const [{ data: profiles }, { data: levels }, { data: members }, { data: lastTx }] =
    await Promise.all([
      admin.from("profiles").select("id, full_name, whatsapp").in("id", queryIds),
      levelIds.length
        ? admin.from("community_levels").select("id, name").in("id", levelIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      admin
        .from("community_members")
        .select("profile_id, status, created_at")
        .in("profile_id", queryIds),
      admin
        .from("loyalty_transactions")
        .select("user_id, created_at")
        .in("user_id", queryIds)
        .order("created_at", { ascending: false }),
    ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const levelById = new Map((levels ?? []).map((l) => [l.id, l]));
  const memberByProfile = new Map((members ?? []).map((m) => [m.profile_id, m]));

  const lastActivityByUser = new Map<string, string>();
  for (const tx of lastTx ?? []) {
    if (!lastActivityByUser.has(tx.user_id)) {
      lastActivityByUser.set(tx.user_id, tx.created_at);
    }
  }

  return (accounts ?? []).map((row) => {
    const profile = profileById.get(row.user_id);
    const level = row.current_level_id
      ? levelById.get(row.current_level_id)
      : null;
    const cm = memberByProfile.get(row.user_id);

    return {
      userId: row.user_id,
      fullName: profile?.full_name ?? null,
      email: profile?.whatsapp ?? null,
      joinedAt: cm?.created_at ?? null,
      pointsBalance: row.points_balance,
      lifetimePoints: row.lifetime_points,
      levelName: level?.name ?? null,
      lastActivity: lastActivityByUser.get(row.user_id) ?? row.updated_at,
      status: cm?.status ?? "active",
    } satisfies AdminCommunityMember;
  });
}

export async function getAdminLoyaltyTransactions(
  limit = 100,
): Promise<LoyaltyTransaction[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("loyalty_transactions")
    .select(
      "id, user_id, transaction_type, points, balance_after, source_type, source_id, description, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAdminLoyaltyTransactions:", error.message);
    return [];
  }

  return (data ?? []) as LoyaltyTransaction[];
}

export async function getAdminCommunityRewards(): Promise<CommunityReward[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_rewards")
    .select(
      "id, name, description, image_url, points_cost, stock, event_id, reward_type, starts_at, ends_at, max_per_user, is_active",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAdminCommunityRewards:", error.message);
    return [];
  }

  return (data ?? []) as CommunityReward[];
}

export async function getAdminCommunitySettings(): Promise<CommunitySettings | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("getAdminCommunitySettings:", error.message);
    return null;
  }

  return data as CommunitySettings | null;
}
