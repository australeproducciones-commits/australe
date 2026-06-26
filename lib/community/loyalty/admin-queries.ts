import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminCommunityMember,
  AdminCommunitySummary,
  CommunityReward,
  CommunitySettings,
  LoyaltyTransaction,
} from "@/lib/community/loyalty/types";

async function countInvitations(
  admin: ReturnType<typeof createAdminClient>,
  filter?: { openedOnly?: boolean },
): Promise<number> {
  try {
    let query = admin
      .from("community_event_invitations")
      .select("id", { count: "exact", head: true });
    if (filter?.openedOnly) {
      query = query.not("opened_at", "is", null);
    }
    const { count, error } = await query;
    if (error) {
      return 0;
    }
    return count ?? 0;
  } catch {
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
    { count: activeMembers },
    { count: newMembersThisMonth },
    { data: earnTx },
    { data: redeemTx },
    { count: pendingRedemptions },
    { count: activeRewards },
    { count: totalRegisteredUsers },
    { count: recentActiveUsers },
    { data: loyaltyBalances },
    { count: completedRedemptions },
    invitationsSent,
    invitationsOpened,
    { count: activeAdvertisingCampaigns },
  ] = await Promise.all([
    admin
      .from("loyalty_accounts")
      .select("user_id", { count: "exact", head: true })
      .gt("lifetime_points", 0),
    admin
      .from("loyalty_accounts")
      .select("user_id", { count: "exact", head: true })
      .gte("updated_at", monthStartIso),
    admin
      .from("loyalty_transactions")
      .select("points")
      .eq("transaction_type", "earn"),
    admin
      .from("loyalty_transactions")
      .select("points")
      .eq("transaction_type", "redeem"),
    admin
      .from("community_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("community_rewards")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer"),
    admin
      .from("loyalty_accounts")
      .select("user_id", { count: "exact", head: true })
      .gte("updated_at", recentCutoffIso),
    admin.from("loyalty_accounts").select("points_balance"),
    admin
      .from("community_redemptions")
      .select("id", { count: "exact", head: true })
      .in("status", ["approved", "used"]),
    countInvitations(admin),
    countInvitations(admin, { openedOnly: true }),
    admin
      .from("advertising_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  const pointsIssued = (earnTx ?? []).reduce((sum, row) => sum + row.points, 0);
  const pointsRedeemed = Math.abs(
    (redeemTx ?? []).reduce((sum, row) => sum + row.points, 0),
  );
  const pointsInCirculation = (loyaltyBalances ?? []).reduce(
    (sum, row) => sum + (row.points_balance ?? 0),
    0,
  );

  return {
    activeMembers: activeMembers ?? 0,
    newMembersThisMonth: newMembersThisMonth ?? 0,
    pointsIssued,
    pointsRedeemed,
    pendingRedemptions: pendingRedemptions ?? 0,
    activeRewards: activeRewards ?? 0,
    totalRegisteredUsers: totalRegisteredUsers ?? 0,
    recentActiveUsers: recentActiveUsers ?? 0,
    pointsInCirculation,
    completedRedemptions: completedRedemptions ?? 0,
    invitationsSent: invitationsSent ?? 0,
    invitationsOpened: invitationsOpened ?? 0,
    activeAdvertisingCampaigns: activeAdvertisingCampaigns ?? 0,
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
