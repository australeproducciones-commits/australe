"use server";

import { requireActiveProfile, requireAdmin } from "@/lib/auth/require";
import { ROUTES } from "@/lib/constants/routes";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  getInviteableEventsForAdmin,
  getRecentInvitationsForUsers,
} from "@/lib/community/invitations/queries";
import type {
  AcceptInvitationResult,
  CreateInvitationsInput,
  CreateInvitationsResult,
} from "@/lib/community/invitations/types";
import {
  INVITATION_CHANNEL,
  INVITATION_STATUS,
  INVITATION_TYPE,
} from "@/lib/community/invitations/types";
import { mapInvitationRpcError } from "@/lib/community/invitations/errors";
import {
  buildInvitationMessage,
  buildInvitationTrackingUrl,
  buildMailtoUrl,
  buildWhatsappUrl,
  computeInvitationExpiresAt,
  generateInvitationToken,
} from "@/lib/community/invitations/utils";
import { fetchAuthEmailsByIds } from "@/lib/users/authEmails";

function revalidateCommunityPaths() {
  revalidatePath(ROUTES.adminComunidad);
}

export async function getInviteableEventsAction() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false as const, error: auth.error, events: [] };
  }
  const events = await getInviteableEventsForAdmin();
  return { success: true as const, events };
}

export async function createCommunityInvitationsAction(
  input: CreateInvitationsInput,
): Promise<CreateInvitationsResult> {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return {
      success: false,
      error: auth.error,
      created: 0,
      skippedDuplicate: 0,
      skippedNoChannel: 0,
      invitations: [],
    };
  }

  const userIds = [...new Set(input.userIds)].filter(Boolean);
  if (userIds.length === 0) {
    return {
      success: false,
      error: "Seleccioná al menos un usuario.",
      created: 0,
      skippedDuplicate: 0,
      skippedNoChannel: 0,
      invitations: [],
    };
  }

  if (!input.eventId) {
    return {
      success: false,
      error: "Seleccioná un evento.",
      created: 0,
      skippedDuplicate: 0,
      skippedNoChannel: 0,
      invitations: [],
    };
  }

  const admin = createAdminClient();
  const events = await getInviteableEventsForAdmin();
  const event = events.find((item) => item.id === input.eventId);
  if (!event) {
    return {
      success: false,
      error: "El evento no está disponible para invitaciones.",
      created: 0,
      skippedDuplicate: 0,
      skippedNoChannel: 0,
      invitations: [],
    };
  }

  const [{ data: profiles }, { data: members }, emailMap, existingMap] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, whatsapp, is_active")
        .in("id", userIds),
      admin
        .from("community_members")
        .select("profile_id, whatsapp")
        .in("profile_id", userIds),
      fetchAuthEmailsByIds(userIds),
      getRecentInvitationsForUsers(userIds, input.eventId),
    ]);

  const memberWhatsapp = new Map(
    (members ?? []).map((m) => [m.profile_id, m.whatsapp]),
  );
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  let created = 0;
  let skippedDuplicate = 0;
  let skippedNoChannel = 0;
  const invitations: CreateInvitationsResult["invitations"] = [];

  for (const userId of userIds) {
    const existing = existingMap.get(userId);
    if (existing && !input.allowResend) {
      skippedDuplicate += 1;
      continue;
    }

    const profile = profileById.get(userId);
    if (!profile || profile.is_active === false) {
      skippedNoChannel += 1;
      continue;
    }

    const whatsapp = memberWhatsapp.get(userId) ?? profile.whatsapp;
    const email = emailMap.get(userId) ?? null;

    if (input.channel === INVITATION_CHANNEL.WHATSAPP && !whatsapp) {
      skippedNoChannel += 1;
      continue;
    }
    if (input.channel === INVITATION_CHANNEL.EMAIL && !email) {
      skippedNoChannel += 1;
      continue;
    }

    const token = generateInvitationToken();
    const trackingUrl = buildInvitationTrackingUrl(token);
    const expiresAt = computeInvitationExpiresAt({
      eventDate: event.event_date,
    }).toISOString();
    const message = buildInvitationMessage({
      event,
      recipientName: profile.full_name,
      customMessage: input.message,
      invitationType: input.invitationType,
      trackingUrl,
    });

    const initialStatus =
      input.channel === INVITATION_CHANNEL.EMAIL
        ? INVITATION_STATUS.PREPARED
        : INVITATION_STATUS.PREPARED;

    const { data: row, error } = await admin
      .from("community_event_invitations")
      .insert({
        user_id: userId,
        event_id: input.eventId,
        invitation_type: input.invitationType,
        channel: input.channel,
        status: initialStatus,
        message,
        public_token: token,
        expires_at: expiresAt,
        created_by: auth.profile.id,
        metadata: {
          resend: Boolean(existing && input.allowResend),
          email_provider_configured: false,
        },
      })
      .select("id, user_id, status")
      .single();

    if (error || !row) {
      console.error("createCommunityInvitationsAction insert:", error?.message);
      continue;
    }

    created += 1;
    const resultItem: CreateInvitationsResult["invitations"][number] = {
      id: row.id,
      userId: row.user_id,
      status: row.status as CreateInvitationsResult["invitations"][number]["status"],
      trackingUrl,
    };

    if (input.channel === INVITATION_CHANNEL.WHATSAPP && whatsapp) {
      resultItem.whatsappUrl = buildWhatsappUrl(whatsapp, message) ?? undefined;
    }
    if (input.channel === INVITATION_CHANNEL.EMAIL && email) {
      resultItem.mailtoUrl = buildMailtoUrl(
        email,
        `Invitación · ${event.name}`,
        `${message}\n\nNota: el envío automático por email no está configurado. Copiá el mensaje o usá su cliente de correo.`,
      );
    }

    invitations.push(resultItem);
  }

  revalidateCommunityPaths();

  if (created === 0 && skippedDuplicate > 0 && skippedNoChannel === 0) {
    return {
      success: false,
      error:
        "Todos los usuarios seleccionados ya tienen una invitación activa para este evento.",
      created,
      skippedDuplicate,
      skippedNoChannel,
      invitations,
    };
  }

  return {
    success: created > 0,
    created,
    skippedDuplicate,
    skippedNoChannel,
    invitations,
  };
}

export async function markInvitationChannelOpenedAction(invitationId: string) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const admin = createAdminClient();
  const { data: current, error: readError } = await admin
    .from("community_event_invitations")
    .select("metadata")
    .eq("id", invitationId)
    .maybeSingle();

  if (readError || !current) {
    return { success: false, error: readError?.message ?? "Invitación no encontrada." };
  }

  const existingMetadata =
    current.metadata && typeof current.metadata === "object" && !Array.isArray(current.metadata)
      ? (current.metadata as Record<string, unknown>)
      : {};

  const { error } = await admin
    .from("community_event_invitations")
    .update({
      metadata: {
        ...existingMetadata,
        channel_opened_at: new Date().toISOString(),
      },
    })
    .eq("id", invitationId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function cancelCommunityInvitationAction(invitationId: string) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_event_invitations")
    .update({
      status: INVITATION_STATUS.CANCELLED,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidateCommunityPaths();
  return { success: true };
}

export async function acceptCommunityInvitationAction(
  token: string,
): Promise<AcceptInvitationResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { success: false, error: "Esta invitación no está disponible." };
  }

  const auth = await requireActiveProfile();
  if ("error" in auth) {
    return { success: false, error: auth.error };
  }

  const { data, error } = await auth.supabase.rpc(
    "accept_community_event_invitation",
    { p_token: trimmed },
  );

  if (error) {
    return { success: false, error: mapInvitationRpcError(error.message) };
  }

  const payload = data as {
    invitation_id?: string;
    event_id?: string;
    event_slug?: string;
    accepted?: boolean;
  } | null;

  if (!payload?.accepted) {
    return {
      success: false,
      error: "No pudimos procesar la invitación. Intentá de nuevo.",
    };
  }

  const eventSlug = payload.event_slug;
  if (!eventSlug) {
    return { success: false, error: "Esta invitación no está disponible." };
  }

  return {
    success: true,
    redirectTo: `${ROUTES.evento(eventSlug)}?invitacion=aceptada`,
  };
}

export async function previewInvitationTypesAction() {
  return {
    types: [
      {
        id: INVITATION_TYPE.INFORMATIONAL,
        label: "Invitación informativa",
        description: "Comparte detalles del evento con enlace de seguimiento.",
      },
      {
        id: INVITATION_TYPE.PURCHASE_LINK,
        label: "Invitación con enlace de compra",
        description: "Incluye enlace al evento para iniciar la compra.",
      },
    ],
    channels: [
      {
        id: INVITATION_CHANNEL.WHATSAPP,
        label: "WhatsApp",
        description: "Abre WhatsApp con el mensaje preparado (no envío automático).",
      },
      {
        id: INVITATION_CHANNEL.EMAIL,
        label: "Email",
        description:
          "Genera enlace mailto: — el envío automático no está configurado.",
      },
      {
        id: INVITATION_CHANNEL.MANUAL,
        label: "Manual",
        description: "Registra la invitación para copiar el mensaje manualmente.",
      },
    ],
  };
}
