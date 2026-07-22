"use server";

import { randomUUID } from "node:crypto";
import { getProfile } from "@/lib/auth/getProfile";
import {
  getGiveawayBySlug,
  getGiveawayEligibility,
  getUserGiveawayParticipation,
} from "@/lib/community/giveaways/queries";
import {
  claimGiveawayPrize,
  enterCommunityGiveaway,
} from "@/lib/community/giveaways/service";
import type { GiveawayActionResult } from "@/lib/community/giveaways/types";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function enterGiveawayAction(
  giveawaySlug: string,
  requestedQuantity = 1,
  requestId?: string,
): Promise<GiveawayActionResult> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile?.id) {
    return { success: false, error: "Iniciá sesión para participar." };
  }

  const giveaway = await getGiveawayBySlug(giveawaySlug);
  if (!giveaway) {
    return { success: false, error: "Sorteo no encontrado." };
  }

  const eligibility = await getGiveawayEligibility(giveaway, profile.id);
  if (!eligibility.eligible) {
    return { success: false, error: eligibility.reason ?? "No cumplís los requisitos." };
  }

  const idempotencyRequestId = requestId?.trim() || randomUUID();

  try {
    const result = await enterCommunityGiveaway(
      profile.id,
      giveaway.id,
      idempotencyRequestId,
      requestedQuantity,
    );

    revalidatePath(ROUTES.comunidadSorteos);
    revalidatePath(ROUTES.comunidadSorteo(giveaway.slug));
    revalidatePath(ROUTES.comunidad);

    return {
      success: true,
      entry_id: result.entryId,
      entry_quantity: result.entryQuantity,
      points_spent: result.pointsSpent,
      points_balance_after: result.pointsBalanceAfter,
      total_user_chances: result.totalUserChances,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo participar.",
    };
  }
}

export async function checkGiveawayEligibilityAction(
  giveawaySlug: string,
): Promise<{
  success: boolean;
  eligibility?: Awaited<ReturnType<typeof getGiveawayEligibility>>;
  participation?: Awaited<ReturnType<typeof getUserGiveawayParticipation>>;
}> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const giveaway = await getGiveawayBySlug(giveawaySlug);

  if (!giveaway) {
    return { success: false };
  }

  const eligibility = await getGiveawayEligibility(giveaway, profile?.id);
  const participation = await getUserGiveawayParticipation(
    giveaway.id,
    profile?.id,
  );

  return { success: true, eligibility, participation };
}

export async function claimGiveawayPrizeAction(
  winnerId: string,
): Promise<GiveawayActionResult> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile?.id) {
    return { success: false, error: "Iniciá sesión para reclamar el premio." };
  }

  try {
    await claimGiveawayPrize(profile.id, winnerId);
    revalidatePath(ROUTES.comunidadSorteos);
    revalidatePath(ROUTES.comunidad);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo reclamar.",
    };
  }
}
