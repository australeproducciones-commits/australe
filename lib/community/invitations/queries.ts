import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { InvitationPreview } from "@/lib/community/invitations/errors";
import type { InviteableEvent } from "@/lib/community/invitations/types";
import { isInvitationExpired } from "@/lib/community/invitations/utils";

export async function getInviteableEventsForAdmin(): Promise<InviteableEvent[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select("id, name, slug, event_date, location_name, status")
    .in("status", [
      EVENT_STATUS.PUBLISHED,
      EVENT_STATUS.SOLD_OUT,
      EVENT_STATUS.DRAFT,
    ])
    .order("event_date", { ascending: true });

  if (error) {
    console.error("getInviteableEventsForAdmin:", error.message);
    return [];
  }

  const now = new Date();
  return (data ?? []).filter(
    (event) =>
      event.status === EVENT_STATUS.PUBLISHED ||
      new Date(event.event_date) >= now,
  ) as InviteableEvent[];
}

export async function getRecentInvitationsForUsers(
  userIds: string[],
  eventId: string,
): Promise<Map<string, { id: string; status: string; created_at: string }>> {
  const map = new Map<string, { id: string; status: string; created_at: string }>();
  if (userIds.length === 0) {
    return map;
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("community_event_invitations")
    .select("id, user_id, status, created_at, expires_at, accepted_at, used_at")
    .eq("event_id", eventId)
    .in("user_id", userIds)
    .is("cancelled_at", null)
    .is("accepted_at", null)
    .is("used_at", null)
    .not("status", "in", '("accepted","used","cancelled","expired")')
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getRecentInvitationsForUsers:", error.message);
    return map;
  }

  for (const row of data ?? []) {
    if (!map.has(row.user_id)) {
      map.set(row.user_id, row);
    }
  }

  return map;
}

export async function recordInvitationOpen(token: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("record_community_invitation_open", {
    p_token: token,
  });
  if (error) {
    console.error("recordInvitationOpen:", error.message);
  }
}

export async function getInvitationAcceptPreview(
  token: string,
  userId: string | null,
): Promise<InvitationPreview> {
  if (!userId) {
    return { state: "login_required" };
  }

  const admin = createAdminClient();
  const { data: invitation, error } = await admin
    .from("community_event_invitations")
    .select(
      "id, user_id, event_id, status, cancelled_at, expires_at, accepted_at, used_at",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (error || !invitation) {
    return { state: "unavailable" };
  }

  if (invitation.cancelled_at || invitation.status === "cancelled") {
    return { state: "unavailable" };
  }

  if (
    invitation.status === "accepted" ||
    invitation.status === "used" ||
    invitation.accepted_at ||
    invitation.used_at
  ) {
    return { state: "already_used" };
  }

  if (isInvitationExpired(invitation.expires_at)) {
    return { state: "expired" };
  }

  if (invitation.user_id !== userId) {
    return { state: "wrong_account" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("is_active")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.is_active) {
    return { state: "disabled" };
  }

  const { data: event } = await admin
    .from("events")
    .select("name, slug, event_date")
    .eq("id", invitation.event_id)
    .maybeSingle();

  if (!event) {
    return { state: "unavailable" };
  }

  return {
    state: "ready",
    event: {
      name: event.name,
      slug: event.slug,
      event_date: event.event_date,
    },
    expiresAt: invitation.expires_at,
  };
}
