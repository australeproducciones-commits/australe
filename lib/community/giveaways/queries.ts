import type {
  CommunityGiveaway,
  CommunityGiveawayAuditLog,
  CommunityGiveawayEntry,
  CommunityGiveawayWinner,
  GiveawayAdminParticipant,
  GiveawayEligibility,
  GiveawayEntryStatus,
  GiveawayListItem,
  GiveawayUserParticipation,
  PublicGiveawayResults,
  PublicGiveawayResultRow,
} from "@/lib/community/giveaways/types";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const GIVEAWAY_PUBLIC_STATUSES = ["scheduled", "active", "closed", "drawn"] as const;

export async function getPublicGiveaways(): Promise<GiveawayListItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_giveaways")
    .select("*")
    .eq("is_public", true)
    .in("status", [...GIVEAWAY_PUBLIC_STATUSES])
    .order("closes_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("getPublicGiveaways:", error.message);
    return [];
  }

  return enrichGiveawayStats(data as CommunityGiveaway[]);
}

export async function getGiveawayBySlug(slug: string): Promise<CommunityGiveaway | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_giveaways")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getGiveawayBySlug:", error.message);
    return null;
  }

  return data as CommunityGiveaway | null;
}

export async function getGiveawayById(id: string): Promise<CommunityGiveaway | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_giveaways")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("getGiveawayById:", error.message);
    return null;
  }

  return data as CommunityGiveaway | null;
}

async function enrichGiveawayStats(
  giveaways: CommunityGiveaway[],
): Promise<GiveawayListItem[]> {
  if (giveaways.length === 0) return [];

  const admin = createAdminClient();
  const ids = giveaways.map((g) => g.id);

  const { data: stats } = await admin
    .from("community_giveaway_entries")
    .select("giveaway_id, user_id, entry_quantity, status")
    .in("giveaway_id", ids)
    .eq("status", "active");

  const map = new Map<string, { participants: Set<string>; chances: number }>();
  for (const row of stats ?? []) {
    const current = map.get(row.giveaway_id) ?? {
      participants: new Set<string>(),
      chances: 0,
    };
    current.participants.add(row.user_id);
    current.chances += row.entry_quantity;
    map.set(row.giveaway_id, current);
  }

  return giveaways.map((g) => {
    const s = map.get(g.id);
    return {
      ...g,
      participant_count: s?.participants.size ?? 0,
      total_chances: s?.chances ?? 0,
    };
  });
}

export async function getUserGiveawayParticipation(
  giveawayId: string,
  userId: string | null | undefined,
): Promise<GiveawayUserParticipation | null> {
  if (!userId) return null;

  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("community_giveaway_entries")
    .select("*")
    .eq("giveaway_id", giveawayId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserGiveawayParticipation:", error.message);
    return null;
  }

  const activeEntries = (entries ?? []).filter((e) => e.status === "active");
  const totalChances = activeEntries.reduce((sum, e) => sum + e.entry_quantity, 0);

  const { data: winner } = await supabase
    .from("community_giveaway_winners")
    .select("*")
    .eq("giveaway_id", giveawayId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    total_entries: entries?.length ?? 0,
    total_chances: totalChances,
    entries: (entries ?? []) as CommunityGiveawayEntry[],
    is_winner: winner?.winner_type === "winner",
    is_alternate: winner?.winner_type === "alternate",
    winner_record: (winner as CommunityGiveawayWinner | null) ?? null,
  };
}

export async function getGiveawayEligibility(
  giveaway: CommunityGiveaway,
  userId: string | null | undefined,
): Promise<GiveawayEligibility> {
  const base: GiveawayEligibility = {
    eligible: false,
    can_enter_manually: ["free", "points", "mixed"].includes(giveaway.entry_type),
    points_balance: 0,
    user_chances: 0,
    max_reached: false,
    insufficient_points: false,
  };

  if (!userId) {
    return { ...base, reason: "Iniciá sesión para participar." };
  }

  const isMember = await isActiveCommunityMember(userId);
  if (!isMember) {
    return { ...base, reason: "Debés ser miembro activo de Comunidad." };
  }

  const supabase = await createClient();
  const { data: account } = await supabase
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const participation = await getUserGiveawayParticipation(giveaway.id, userId);
  const userChances = participation?.total_chances ?? 0;
  const pointsBalance = account?.points_balance ?? 0;

  base.points_balance = pointsBalance;
  base.user_chances = userChances;

  if (giveaway.status !== "active") {
    return { ...base, reason: "El sorteo no está abierto." };
  }

  const now = Date.now();
  if (giveaway.starts_at && new Date(giveaway.starts_at).getTime() > now) {
    return { ...base, reason: "El sorteo aún no comenzó." };
  }
  if (giveaway.closes_at && new Date(giveaway.closes_at).getTime() < now) {
    return { ...base, reason: "El sorteo ya cerró." };
  }

  if (!base.can_enter_manually) {
    return { ...base, reason: "Este sorteo acredita participaciones automáticamente." };
  }

  if (
    giveaway.max_entries_per_user !== null &&
    userChances >= giveaway.max_entries_per_user
  ) {
    return { ...base, max_reached: true, reason: "Alcanzaste el límite de participaciones." };
  }

  if (!giveaway.allow_multiple_entries && userChances > 0) {
    return { ...base, max_reached: true, reason: "Ya participaste en este sorteo." };
  }

  if (
    giveaway.entry_type === "points" &&
    pointsBalance < giveaway.points_cost
  ) {
    return {
      ...base,
      insufficient_points: true,
      reason: "No tenés puntos suficientes.",
    };
  }

  if (
    giveaway.entry_type === "mixed" &&
    pointsBalance < giveaway.points_cost
  ) {
    return {
      ...base,
      insufficient_points: true,
      reason: "No tenés puntos suficientes para la participación mixta.",
    };
  }

  return { ...base, eligible: true };
}

export async function getPublicCommunityGiveawayResults(
  slug: string,
): Promise<PublicGiveawayResults | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_public_community_giveaway_results", {
    p_giveaway_slug: slug,
  });

  if (error) {
    console.error("getPublicCommunityGiveawayResults:", error.message);
    return null;
  }

  if (!data?.length) {
    return null;
  }

  const first = data[0];
  const winners: PublicGiveawayResultRow[] = data
    .filter((row) => row.winner_type != null && row.position != null)
    .map((row) => ({
      display_name: row.display_name,
      winner_type: row.winner_type as PublicGiveawayResultRow["winner_type"],
      position: row.position,
      status_public: row.status_public,
      selected_at: row.selected_at,
      claimed_at: row.claimed_at,
      verification_code: row.verification_code,
    }));

  const verificationCode =
    winners.find((w) => w.winner_type === "winner" && w.position === 1)?.verification_code ??
    first.verification_code ??
    null;

  return {
    giveaway_name: first.giveaway_name,
    drawn_at: first.drawn_at,
    participant_count: first.participant_count ?? 0,
    total_chances: first.total_chances ?? 0,
    verification_code: verificationCode,
    winners,
  };
}

/** @deprecated Usar getPublicCommunityGiveawayResults (RPC sanitizada). */
export async function getGiveawayPublicWinners(
  giveawaySlug: string,
): Promise<PublicGiveawayResultRow[]> {
  const results = await getPublicCommunityGiveawayResults(giveawaySlug);
  return results?.winners ?? [];
}

export async function getGiveawayTransparencyStats(giveawayId: string) {
  const admin = createAdminClient();
  const { data: entries } = await admin
    .from("community_giveaway_entries")
    .select("user_id, entry_quantity")
    .eq("giveaway_id", giveawayId)
    .eq("status", "active");

  const participants = new Set((entries ?? []).map((e) => e.user_id));
  const totalChances = (entries ?? []).reduce((s, e) => s + e.entry_quantity, 0);

  const { data: winners } = await admin
    .from("community_giveaway_winners")
    .select("verification_code, winner_type")
    .eq("giveaway_id", giveawayId)
    .eq("winner_type", "winner")
    .order("position", { ascending: true })
    .limit(1);

  return {
    participant_count: participants.size,
    total_chances: totalChances,
    verification_code: winners?.[0]?.verification_code ?? null,
  };
}

export async function getAdminGiveaways(): Promise<CommunityGiveaway[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_giveaways")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAdminGiveaways:", error.message);
    return [];
  }

  return (data ?? []) as CommunityGiveaway[];
}

export async function getAdminGiveawayParticipants(
  giveawayId: string,
  search?: string,
): Promise<GiveawayAdminParticipant[]> {
  const admin = createAdminClient();
  const { data: entries, error } = await admin
    .from("community_giveaway_entries")
    .select("*")
    .eq("giveaway_id", giveawayId)
    .order("created_at", { ascending: false });

  if (error || !entries?.length) return [];

  const userIds = [...new Set(entries.map((e) => e.user_id))];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(
    (authUsers?.users ?? [])
      .filter((u) => userIds.includes(u.id))
      .map((u) => [u.id, u.email ?? null]),
  );

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string | null]),
  );

  let result: GiveawayAdminParticipant[] = entries.map((e) => ({
    entry_id: e.id,
    user_id: e.user_id,
    full_name: nameMap.get(e.user_id) ?? null,
    email: emailMap.get(e.user_id) ?? null,
    entry_quantity: e.entry_quantity,
    source_type: e.source_type,
    status: e.status as GiveawayEntryStatus,
    points_spent: Number((e.metadata as Record<string, unknown>)?.points_spent ?? 0),
    created_at: e.created_at,
  }));

  if (search?.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (r) =>
        r.full_name?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q),
    );
  }

  return result;
}

export async function getAdminGiveawayWinners(
  giveawayId: string,
): Promise<CommunityGiveawayWinner[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_giveaway_winners")
    .select("*")
    .eq("giveaway_id", giveawayId)
    .order("winner_type")
    .order("position");

  if (error) return [];
  return (data ?? []) as CommunityGiveawayWinner[];
}

export async function getAdminGiveawayAuditLogs(
  giveawayId: string,
): Promise<CommunityGiveawayAuditLog[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_giveaway_audit_logs")
    .select("*")
    .eq("giveaway_id", giveawayId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as CommunityGiveawayAuditLog[];
}

export async function giveawayHasActiveEntries(giveawayId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("community_giveaway_entries")
    .select("id", { count: "exact", head: true })
    .eq("giveaway_id", giveawayId)
    .eq("status", "active");

  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getActiveAutomaticGiveaways(
  entryTypes: string[],
): Promise<CommunityGiveaway[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_giveaways")
    .select("*")
    .in("status", ["active", "scheduled"])
    .in("entry_type", entryTypes);

  if (error) return [];
  return (data ?? []) as CommunityGiveaway[];
}
