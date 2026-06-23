"use server";

import { getProfile } from "@/lib/auth/getProfile";
import { redeemCommunityReward } from "@/lib/community/loyalty/service";
import type { LoyaltyActionResult } from "@/lib/community/loyalty/types";
import { ROUTES } from "@/lib/constants/routes";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function redeemCommunityRewardAction(
  rewardId: string,
): Promise<LoyaltyActionResult> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);

  if (!profile?.id) {
    return { success: false, error: "Iniciá sesión para canjear recompensas." };
  }

  try {
    const result = await redeemCommunityReward(profile.id, rewardId);
    revalidatePath(ROUTES.comunidad);
    return {
      success: true,
      redemptionCode: result.redemptionCode,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo completar el canje.",
    };
  }
}
