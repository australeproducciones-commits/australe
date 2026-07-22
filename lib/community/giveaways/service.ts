import { createAdminClient } from "@/lib/supabase/admin";
import type { GiveawayDrawResult } from "@/lib/community/giveaways/types";

export async function enterCommunityGiveaway(
  userId: string,
  giveawayId: string,
  requestId: string,
  requestedQuantity = 1,
): Promise<{
  entryId: string;
  entryQuantity: number;
  pointsSpent: number;
  pointsBalanceAfter: number;
  totalUserChances: number;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("enter_community_giveaway", {
    p_giveaway_id: giveawayId,
    p_user_id: userId,
    p_requested_quantity: requestedQuantity,
    p_request_id: requestId,
  });

  if (error) {
    const message = error.message;
    if (message.includes("saldo insuficiente")) {
      throw new Error("No tenés puntos suficientes.");
    }
    if (message.includes("límite")) {
      throw new Error("Alcanzaste el límite de participaciones.");
    }
    if (message.includes("ya participaste")) {
      throw new Error("Ya participaste en este sorteo.");
    }
    if (message.includes("no está abierto") || message.includes("cerró") || message.includes("comenzó")) {
      throw new Error(message);
    }
    if (message.includes("no autorizado") || message.includes("miembro activo")) {
      throw new Error(message);
    }
    console.error("enterCommunityGiveaway:", message);
    throw new Error("No se pudo registrar la participación.");
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error("Respuesta inválida del servidor.");
  }

  return {
    entryId: row.entry_id as string,
    entryQuantity: row.entry_quantity as number,
    pointsSpent: row.points_spent as number,
    pointsBalanceAfter: row.points_balance_after as number,
    totalUserChances: row.total_user_chances as number,
  };
}

export async function claimGiveawayPrize(
  userId: string,
  winnerId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("claim_community_giveaway_prize", {
    p_winner_id: winnerId,
    p_user_id: userId,
  });

  if (error) {
    console.error("claimGiveawayPrize:", error.message);
    throw new Error(error.message.includes("vencido")
      ? "El plazo para reclamar el premio venció."
      : "No se pudo reclamar el premio.");
  }
}

export async function drawCommunityGiveaway(
  giveawayId: string,
  adminId: string,
): Promise<GiveawayDrawResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("draw_community_giveaway", {
    p_giveaway_id: giveawayId,
    p_admin_id: adminId,
  });

  if (error) {
    console.error("drawCommunityGiveaway:", error.message);
    return { success: false, error: error.message };
  }

  const result = data as Record<string, unknown>;
  if (result.already_drawn) {
    return { success: true, already_drawn: true };
  }

  return {
    success: true,
    winners: Number(result.winners ?? 0),
    alternates: Number(result.alternates ?? 0),
    participants: Number(result.participants ?? 0),
    total_chances: Number(result.total_chances ?? 0),
    draw_seed_hash: String(result.draw_seed_hash ?? ""),
  };
}

export async function cancelCommunityGiveaway(
  giveawayId: string,
  adminId: string,
  reason?: string,
): Promise<{ refundedEntries: number }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("cancel_community_giveaway", {
    p_giveaway_id: giveawayId,
    p_admin_id: adminId,
    p_reason: reason ?? null,
  });

  if (error) {
    console.error("cancelCommunityGiveaway:", error.message);
    throw new Error("No se pudo cancelar el sorteo.");
  }

  const result = data as Record<string, unknown>;
  return { refundedEntries: Number(result.refunded_entries ?? 0) };
}

export async function disqualifyGiveawayEntry(
  entryId: string,
  adminId: string,
  reason: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("disqualify_community_giveaway_entry", {
    p_entry_id: entryId,
    p_admin_id: adminId,
    p_reason: reason,
  });

  if (error) {
    throw new Error("No se pudo descalificar la participación.");
  }
}

export async function activateGiveawayAlternate(
  giveawayId: string,
  adminId: string,
): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("activate_community_giveaway_alternate", {
    p_giveaway_id: giveawayId,
    p_admin_id: adminId,
  });

  if (error) {
    throw new Error("No hay suplentes disponibles o no se pudo activar.");
  }

  return data as string;
}

export async function maintainCommunityGiveaways(): Promise<Record<string, number>> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("maintain_community_giveaways");

  if (error) {
    console.error("maintainCommunityGiveaways:", error.message);
    return { activated: 0, closed: 0, expired_winners: 0 };
  }

  return data as Record<string, number>;
}

export async function createAutomaticGiveawayEntry(
  giveawayId: string,
  userId: string,
  sourceType: string,
  sourceReferenceId: string,
  entryQuantity = 1,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_automatic_giveaway_entry", {
    p_giveaway_id: giveawayId,
    p_user_id: userId,
    p_source_type: sourceType,
    p_source_reference_id: sourceReferenceId,
    p_entry_quantity: entryQuantity,
  });

  if (error) {
    console.error("createAutomaticGiveawayEntry:", error.message);
    return null;
  }

  return (data as string | null) ?? null;
}

/**
 * Acredita participaciones automáticas para sorteos activos.
 * Diseñado para invocarse tras confirmar ticket o compra de tienda.
 * Fallos no deben interrumpir el flujo principal de pago.
 */
export async function processAutomaticGiveawayEntries(input: {
  userId: string;
  sourceType: "ticket" | "store_purchase";
  sourceReferenceId: string;
}): Promise<void> {
  try {
    const { getActiveAutomaticGiveaways } = await import(
      "@/lib/community/giveaways/queries"
    );

    const entryTypeMap: Record<string, string[]> = {
      ticket: ["ticket", "automatic", "mixed"],
      store_purchase: ["store_purchase", "automatic", "mixed"],
    };

    const giveaways = await getActiveAutomaticGiveaways(
      entryTypeMap[input.sourceType] ?? ["automatic"],
    );

    for (const giveaway of giveaways) {
      await createAutomaticGiveawayEntry(
        giveaway.id,
        input.userId,
        input.sourceType,
        input.sourceReferenceId,
      );
    }
  } catch (error) {
    console.error("processAutomaticGiveawayEntries:", error);
  }
}
