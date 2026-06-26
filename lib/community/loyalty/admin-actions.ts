"use server";

import { requireAdmin } from "@/lib/auth/require";
import { adjustLoyaltyPointsAdmin } from "@/lib/community/loyalty/service";
import type { CommunitySettings, LoyaltyActionResult } from "@/lib/community/loyalty/types";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

function revalidateAdminCommunity() {
  revalidatePath(ROUTES.adminComunidad);
  revalidatePath(ROUTES.adminComunidadUsuarios);
  revalidatePath(ROUTES.adminComunidadRecompensas);
  revalidatePath(ROUTES.adminComunidadPublicidad);
  revalidatePath(ROUTES.adminComunidadMovimientos);
  revalidatePath(ROUTES.adminComunidadConfiguracion);
  revalidatePath(ROUTES.adminComunidadInvitaciones);
}

export async function adjustMemberPointsAction(
  userId: string,
  points: number,
  reason: string,
): Promise<LoyaltyActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const trimmed = reason.trim();
  if (!trimmed) {
    return { success: false, error: "El motivo es obligatorio." };
  }

  if (!Number.isFinite(points) || points === 0) {
    return { success: false, error: "Ingresá una cantidad distinta de cero." };
  }

  try {
    await adjustLoyaltyPointsAdmin(userId, points, trimmed, auth.profile.id);
    revalidateAdminCommunity();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "No se pudo aplicar el ajuste.",
    };
  }
}

export async function updateCommunitySettingsAction(
  settings: Partial<CommunitySettings>,
): Promise<LoyaltyActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_settings")
    .update({
      community_enabled: settings.community_enabled,
      ticket_points_enabled: settings.ticket_points_enabled,
      consumption_points_enabled: settings.consumption_points_enabled,
      amount_per_point: settings.amount_per_point,
      welcome_points: settings.welcome_points,
      public_title: settings.public_title,
      public_description: settings.public_description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    return { success: false, error: "No se pudo guardar la configuración." };
  }

  revalidateAdminCommunity();
  revalidatePath(ROUTES.comunidad);
  return { success: true };
}

type RewardFormInput = {
  id?: string;
  name: string;
  description: string;
  points_cost: number;
  stock: number | null;
  is_active: boolean;
  max_per_user: number | null;
};

export async function saveCommunityRewardAction(
  input: RewardFormInput,
): Promise<LoyaltyActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!input.name.trim() || input.points_cost <= 0) {
    return { success: false, error: "Nombre y costo en puntos son obligatorios." };
  }

  const admin = createAdminClient();
  const payload = {
    name: input.name.trim(),
    description: input.description.trim() || null,
    points_cost: input.points_cost,
    stock: input.stock,
    is_active: input.is_active,
    max_per_user: input.max_per_user,
    reward_type: "benefit",
    image_url: null,
    event_id: null,
    reward_value: null,
    starts_at: null,
    ends_at: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await admin.from("community_rewards").update(payload).eq("id", input.id)
    : await admin.from("community_rewards").insert(payload);

  if (error) {
    return { success: false, error: "No se pudo guardar la recompensa." };
  }

  revalidateAdminCommunity();
  revalidatePath(ROUTES.comunidad);
  return { success: true };
}

export async function toggleCommunityRewardAction(
  rewardId: string,
  isActive: boolean,
): Promise<LoyaltyActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_rewards")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", rewardId);

  if (error) {
    return { success: false, error: "No se pudo actualizar la recompensa." };
  }

  revalidateAdminCommunity();
  revalidatePath(ROUTES.comunidad);
  return { success: true };
}

export async function updateMemberStatusAction(
  profileId: string,
  status: string,
  reason: string | null,
): Promise<LoyaltyActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const admin = createAdminClient();
  const update: {
    status: string;
    updated_at: string;
    suspended_at?: string;
    suspension_reason?: string | null;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "suspended" || status === "disabled") {
    update.suspended_at = new Date().toISOString();
    update.suspension_reason = reason?.trim() || null;
  }

  const { error } = await admin
    .from("community_members")
    .update(update)
    .eq("profile_id", profileId);

  if (error) {
    return { success: false, error: "No se pudo actualizar el estado del miembro." };
  }

  revalidateAdminCommunity();
  return { success: true };
}
