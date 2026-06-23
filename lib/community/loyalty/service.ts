import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Operaciones de puntos vía RPC atómico (service_role).
 * Nunca exponer al cliente la lógica de saldo final.
 */

export async function ensureCommunityMember(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("ensure_loyalty_account", {
    p_user_id: userId,
  });

  if (error) {
    console.error("ensureCommunityMember:", error.message);
    throw new Error("No se pudo inicializar la cuenta de puntos.");
  }
}

export async function awardLoyaltyPointsForTicket(
  ticketId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("award_loyalty_points_for_ticket", {
    p_ticket_id: ticketId,
  });

  if (error) {
    console.error("awardLoyaltyPointsForTicket:", error.message);
    return null;
  }

  return (data as string | null) ?? null;
}

export async function reverseLoyaltyPointsForTicket(
  ticketId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reverse_loyalty_points_for_ticket", {
    p_ticket_id: ticketId,
  });

  if (error) {
    console.error("reverseLoyaltyPointsForTicket:", error.message);
    return null;
  }

  return (data as string | null) ?? null;
}

export async function redeemCommunityReward(
  userId: string,
  rewardId: string,
): Promise<{ redemptionId: string; redemptionCode: string; pointsSpent: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("redeem_community_reward", {
    p_user_id: userId,
    p_reward_id: rewardId,
  });

  if (error) {
    const message = error.message;
    if (message.includes("saldo insuficiente")) {
      throw new Error("No tenés puntos suficientes para este canje.");
    }
    if (message.includes("agotada")) {
      throw new Error("Esta recompensa está agotada.");
    }
    if (message.includes("límite")) {
      throw new Error("Ya alcanzaste el límite de canjes para esta recompensa.");
    }
    if (message.includes("no disponible") || message.includes("expirada")) {
      throw new Error("Esta recompensa no está disponible.");
    }
    console.error("redeemCommunityReward:", message);
    throw new Error("No se pudo completar el canje.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("No se pudo completar el canje.");
  }

  return {
    redemptionId: row.redemption_id as string,
    redemptionCode: row.redemption_code as string,
    pointsSpent: row.points_spent as number,
  };
}

export async function adjustLoyaltyPointsAdmin(
  userId: string,
  points: number,
  reason: string,
  adminId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("adjust_loyalty_points", {
    p_user_id: userId,
    p_points: points,
    p_reason: reason,
    p_admin_id: adminId,
  });

  if (error) {
    console.error("adjustLoyaltyPointsAdmin:", error.message);
    throw new Error("No se pudo aplicar el ajuste de puntos.");
  }
}

export async function recalculateCommunityLevel(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("recalculate_loyalty_level", {
    p_user_id: userId,
  });

  if (error) {
    console.error("recalculateCommunityLevel:", error.message);
  }
}
