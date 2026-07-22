"use server";

import { requireAdmin } from "@/lib/auth/require";
import {
  giveawayHasActiveEntries,
  getGiveawayById,
} from "@/lib/community/giveaways/queries";
import {
  activateGiveawayAlternate,
  cancelCommunityGiveaway,
  disqualifyGiveawayEntry,
  drawCommunityGiveaway,
} from "@/lib/community/giveaways/service";
import type {
  GiveawayActionResult,
  GiveawayDrawResult,
  GiveawayFormInput,
  GiveawayStatus,
} from "@/lib/community/giveaways/types";
import {
  buildGiveawaySlug,
  canEditEssentialRules,
  validateGiveawayForm,
  validateGiveawayImageUrl,
} from "@/lib/community/giveaways/validation";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";
import { revalidatePath } from "next/cache";

function revalidateGiveawayPaths(slug?: string) {
  revalidatePath(ROUTES.adminComunidadSorteos);
  revalidatePath(ROUTES.comunidadSorteos);
  revalidatePath(ROUTES.comunidad);
  if (slug) {
    revalidatePath(ROUTES.comunidadSorteo(slug));
  }
}

function revalidateAdminCommunity() {
  revalidatePath(ROUTES.adminComunidad);
  revalidatePath(ROUTES.adminComunidadSorteos);
}

async function logGiveawayAudit(
  giveawayId: string,
  actorId: string,
  action: string,
  previousData?: Record<string, unknown> | null,
  newData?: Record<string, unknown> | null,
  metadata?: Record<string, unknown>,
) {
  const admin = createAdminClient();
  await admin.from("community_giveaway_audit_logs").insert({
    giveaway_id: giveawayId,
    actor_user_id: actorId,
    action,
    entity_type: "giveaway",
    entity_id: giveawayId,
    previous_data: (previousData ?? null) as Json,
    new_data: (newData ?? null) as Json,
    metadata: (metadata ?? {}) as Json,
  });
}

function toDbPayload(input: GiveawayFormInput, createdBy?: string) {
  const imageUrlError = validateGiveawayImageUrl(input.image_url);
  if (imageUrlError) {
    throw new Error(imageUrlError);
  }

  return {
    name: input.name.trim(),
    slug: buildGiveawaySlug(input.name, input.slug),
    short_description: input.short_description?.trim() || null,
    description: input.description?.trim() || null,
    prize_description: input.prize_description.trim(),
    image_url: input.image_url?.trim() || null,
    terms_and_conditions: input.terms_and_conditions?.trim() || null,
    status: input.status ?? "draft",
    entry_type: input.entry_type,
    points_cost: input.points_cost ?? 0,
    max_entries_per_user: input.max_entries_per_user ?? null,
    allow_multiple_entries: input.allow_multiple_entries ?? false,
    winner_count: input.winner_count ?? 1,
    alternate_count: input.alternate_count ?? 0,
    starts_at: input.starts_at ?? null,
    closes_at: input.closes_at ?? null,
    draw_at: input.draw_at ?? null,
    claim_deadline: input.claim_deadline ?? null,
    related_event_id: input.related_event_id ?? null,
    requires_valid_ticket: input.requires_valid_ticket ?? false,
    requires_used_ticket: input.requires_used_ticket ?? false,
    minimum_purchase_amount: input.minimum_purchase_amount ?? null,
    minimum_community_level: input.minimum_community_level ?? null,
    level_bonus_config: (input.level_bonus_config ?? {}) as Json,
    is_public: input.is_public ?? true,
    allow_duplicate_winners: input.allow_duplicate_winners ?? false,
    drawn_at: null,
    cancelled_at: null,
    created_by: createdBy ?? null,
  };
}

export async function saveGiveawayAction(
  input: GiveawayFormInput,
  giveawayId?: string,
): Promise<GiveawayActionResult & { id?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const validationError = validateGiveawayForm(input);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const admin = createAdminClient();
  const payload = toDbPayload(input, auth.profile.id);

  if (giveawayId) {
    const existing = await getGiveawayById(giveawayId);
    if (!existing) {
      return { success: false, error: "Sorteo no encontrado." };
    }

    const hasEntries = await giveawayHasActiveEntries(giveawayId);
    if (!canEditEssentialRules(hasEntries)) {
      const essentialChanged =
        existing.entry_type !== payload.entry_type ||
        existing.points_cost !== payload.points_cost ||
        existing.max_entries_per_user !== payload.max_entries_per_user ||
        existing.winner_count !== payload.winner_count ||
        JSON.stringify(existing.level_bonus_config) !==
          JSON.stringify(payload.level_bonus_config);

      if (essentialChanged) {
        return {
          success: false,
          error:
            "No se pueden modificar reglas esenciales con participaciones activas.",
        };
      }
    }

    if (!["draft", "scheduled"].includes(existing.status) && existing.status !== payload.status) {
      // status changes go through dedicated actions
    }

    const { data, error } = await admin
      .from("community_giveaways")
      .update(payload)
      .eq("id", giveawayId)
      .select("id, slug")
      .single();

    if (error) {
      return { success: false, error: "No se pudo actualizar el sorteo." };
    }

    await logGiveawayAudit(
      giveawayId,
      auth.profile.id,
      "updated",
      existing as unknown as Record<string, unknown>,
      payload as unknown as Record<string, unknown>,
    );

    revalidateGiveawayPaths(data.slug);
    return { success: true, id: data.id };
  }

  const { data, error } = await admin
    .from("community_giveaways")
    .insert(payload)
    .select("id, slug")
    .single();

  if (error) {
    if (error.message.includes("unique")) {
      return { success: false, error: "El slug ya está en uso." };
    }
    return { success: false, error: "No se pudo crear el sorteo." };
  }

  await logGiveawayAudit(
    data.id,
    auth.profile.id,
    "created",
    null,
    payload as unknown as Record<string, unknown>,
  );

  revalidateGiveawayPaths(data.slug);
  revalidateAdminCommunity();
  return { success: true, id: data.id };
}

export async function updateGiveawayStatusAction(
  giveawayId: string,
  status: GiveawayStatus,
): Promise<GiveawayActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const existing = await getGiveawayById(giveawayId);
  if (!existing) {
    return { success: false, error: "Sorteo no encontrado." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_giveaways")
    .update({ status })
    .eq("id", giveawayId)
    .select("slug")
    .single();

  if (error) {
    return { success: false, error: "No se pudo actualizar el estado." };
  }

  const actionMap: Partial<Record<GiveawayStatus, string>> = {
    scheduled: "scheduled",
    active: "activated",
    closed: "closed",
  };

  await logGiveawayAudit(
    giveawayId,
    auth.profile.id,
    actionMap[status] ?? "updated",
    { status: existing.status },
    { status },
  );

  revalidateGiveawayPaths(data.slug);
  return { success: true };
}

export async function cancelGiveawayAction(
  giveawayId: string,
  reason: string,
): Promise<GiveawayActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  try {
    const result = await cancelCommunityGiveaway(
      giveawayId,
      auth.profile.id,
      reason.trim() || undefined,
    );
    const giveaway = await getGiveawayById(giveawayId);
    revalidateGiveawayPaths(giveaway?.slug);
    return {
      success: true,
      error:
        result.refundedEntries > 0
          ? `Cancelado. ${result.refundedEntries} participación(es) reintegrada(s).`
          : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo cancelar.",
    };
  }
}

export async function drawGiveawayAction(
  giveawayId: string,
): Promise<GiveawayDrawResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const result = await drawCommunityGiveaway(giveawayId, auth.profile.id);
  const giveaway = await getGiveawayById(giveawayId);
  revalidateGiveawayPaths(giveaway?.slug);
  return result;
}

export async function disqualifyEntryAction(
  entryId: string,
  reason: string,
): Promise<GiveawayActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  if (!reason.trim()) {
    return { success: false, error: "El motivo es obligatorio." };
  }

  try {
    await disqualifyGiveawayEntry(entryId, auth.profile.id, reason.trim());
    revalidatePath(ROUTES.adminComunidadSorteos);
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo descalificar." };
  }
}

export async function activateAlternateAction(
  giveawayId: string,
): Promise<GiveawayActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  try {
    await activateGiveawayAlternate(giveawayId, auth.profile.id);
    const giveaway = await getGiveawayById(giveawayId);
    revalidateGiveawayPaths(giveaway?.slug);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "No se pudo activar suplente.",
    };
  }
}

export async function markWinnerNotifiedAction(
  winnerId: string,
): Promise<GiveawayActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_giveaway_winners")
    .update({ status: "notified", notified_at: new Date().toISOString() })
    .eq("id", winnerId);

  if (error) {
    return { success: false, error: "No se pudo marcar como notificado." };
  }

  return { success: true };
}

export async function markPrizeClaimedAction(
  winnerId: string,
): Promise<GiveawayActionResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_giveaway_winners")
    .update({ status: "claimed", claimed_at: new Date().toISOString() })
    .eq("id", winnerId);

  if (error) {
    return { success: false, error: "No se pudo marcar como reclamado." };
  }

  return { success: true };
}

export async function exportParticipantsCsvAction(
  giveawayId: string,
): Promise<{ success: boolean; csv?: string; error?: string }> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { getAdminGiveawayParticipants } = await import(
    "@/lib/community/giveaways/queries"
  );
  const participants = await getAdminGiveawayParticipants(giveawayId);

  const header = "nombre,email,cantidad,origen,estado,puntos,fecha";
  const rows = participants.map((p) =>
  [
    `"${(p.full_name ?? "").replace(/"/g, '""')}"`,
    `"${(p.email ?? "").replace(/"/g, '""')}"`,
    p.entry_quantity,
    p.source_type,
    p.status,
    p.points_spent,
    p.created_at,
  ].join(","),
  );

  return { success: true, csv: [header, ...rows].join("\n") };
}
