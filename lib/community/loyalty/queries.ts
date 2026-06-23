import { getCustomerTickets } from "@/lib/ticket-sales/queries";
import { TICKET_PAYMENT_STATUS, TICKET_STATUS } from "@/lib/ticket-sales/types";
import { createClient } from "@/lib/supabase/server";
import { ensureCommunityMember } from "@/lib/community/loyalty/service";
import type {
  CommunityDashboard,
  CommunityLevel,
  CommunityRedemption,
  CommunityReward,
  CommunitySettings,
  CommunityUpcomingEvent,
  LoyaltyAccount,
  LoyaltyTransaction,
} from "@/lib/community/loyalty/types";

export async function getCommunitySettings(): Promise<CommunitySettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("getCommunitySettings:", error.message);
    return null;
  }

  return data as CommunitySettings | null;
}

export async function getActiveCommunityLevels(): Promise<CommunityLevel[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_levels")
    .select(
      "id, name, minimum_lifetime_points, description, benefits, sort_order, is_active",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("getActiveCommunityLevels:", error.message);
    return [];
  }

  return (data ?? []) as CommunityLevel[];
}

export async function getLoyaltyAccountForUser(
  userId: string,
): Promise<LoyaltyAccount | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_accounts")
    .select("user_id, points_balance, lifetime_points, current_level_id, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getLoyaltyAccountForUser:", error.message);
    return null;
  }

  return data as LoyaltyAccount | null;
}

export async function getRecentLoyaltyTransactions(
  userId: string,
  limit = 10,
): Promise<LoyaltyTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("loyalty_transactions")
    .select(
      "id, user_id, transaction_type, points, balance_after, source_type, source_id, description, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentLoyaltyTransactions:", error.message);
    return [];
  }

  return (data ?? []) as LoyaltyTransaction[];
}

export async function getAvailableCommunityRewards(): Promise<CommunityReward[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("community_rewards")
    .select(
      "id, name, description, image_url, points_cost, stock, event_id, reward_type, starts_at, ends_at, max_per_user, is_active",
    )
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("points_cost", { ascending: true });

  if (error) {
    console.error("getAvailableCommunityRewards:", error.message);
    return [];
  }

  return (data ?? []) as CommunityReward[];
}

export async function getUserCommunityRedemptions(
  userId: string,
  limit = 10,
): Promise<CommunityRedemption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_redemptions")
    .select("id, user_id, reward_id, points_spent, redemption_code, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getUserCommunityRedemptions:", error.message);
    return [];
  }

  const rewardIds = [...new Set((data ?? []).map((row) => row.reward_id))];
  const rewardsById = new Map<string, { name: string; description: string | null }>();

  if (rewardIds.length > 0) {
    const { data: rewards } = await supabase
      .from("community_rewards")
      .select("id, name, description")
      .in("id", rewardIds);

    for (const reward of rewards ?? []) {
      rewardsById.set(reward.id, {
        name: reward.name,
        description: reward.description,
      });
    }
  }

  return (data ?? []).map((row) => {
    const reward = rewardsById.get(row.reward_id);

    return {
      id: row.id,
      user_id: row.user_id,
      reward_id: row.reward_id,
      points_spent: row.points_spent,
      redemption_code: row.redemption_code,
      status: row.status,
      created_at: row.created_at,
      reward: reward
        ? { name: reward.name, description: reward.description }
        : undefined,
    } as CommunityRedemption;
  });
}

function resolveLevel(
  levels: CommunityLevel[],
  lifetimePoints: number,
  currentLevelId: string | null,
): { level: CommunityLevel | null; nextLevel: CommunityLevel | null } {
  const sorted = [...levels].sort(
    (a, b) => a.minimum_lifetime_points - b.minimum_lifetime_points,
  );

  let level: CommunityLevel | null =
    sorted.find((l) => l.id === currentLevelId) ?? null;

  if (!level) {
    level =
      [...sorted]
        .reverse()
        .find((l) => l.minimum_lifetime_points <= lifetimePoints) ?? null;
  }

  const nextLevel =
    sorted.find(
      (l) => l.minimum_lifetime_points > (level?.minimum_lifetime_points ?? -1),
    ) ?? null;

  return { level, nextLevel };
}

async function getUpcomingEventsForUser(): Promise<CommunityUpcomingEvent[]> {
  const tickets = await getCustomerTickets();
  const today = new Date().toISOString().slice(0, 10);

  return tickets
    .filter(
      (t) =>
        t.payment_status === TICKET_PAYMENT_STATUS.CONFIRMED &&
        t.ticket_status !== TICKET_STATUS.CANCELLED &&
        t.ticket_status !== TICKET_STATUS.EXPIRED &&
        t.event_date &&
        t.event_date >= today,
    )
    .map((t) => ({
      ticketId: t.id,
      eventId: t.event_id,
      eventName: t.event_name,
      eventSlug: t.event_slug,
      eventDate: t.event_date,
      ticketStatus: t.ticket_status,
    }))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .slice(0, 6);
}

export async function getCommunityDashboard(
  userId: string,
): Promise<CommunityDashboard | null> {
  const settings = await getCommunitySettings();
  if (!settings) {
    return null;
  }

  try {
    await ensureCommunityMember(userId);
  } catch (error) {
    console.error("getCommunityDashboard ensure:", error);
  }

  const [account, levels, transactions, rewards, redemptions, upcomingEvents] =
    await Promise.all([
      getLoyaltyAccountForUser(userId),
      getActiveCommunityLevels(),
      getRecentLoyaltyTransactions(userId),
      getAvailableCommunityRewards(),
      getUserCommunityRedemptions(userId),
      getUpcomingEventsForUser(),
    ]);

  const lifetime = account?.lifetime_points ?? 0;
  const { level, nextLevel } = resolveLevel(
    levels,
    lifetime,
    account?.current_level_id ?? null,
  );

  return {
    settings,
    account,
    level,
    nextLevel,
    transactions,
    rewards,
    redemptions,
    upcomingEvents,
  };
}
