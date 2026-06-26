import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { InvitationPreview } from "@/lib/community/invitations/errors";
import type { InviteableEvent } from "@/lib/community/invitations/types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type ServerSupabase = SupabaseClient<Database>;

type PreviewRpcPayload = {
  state: InvitationPreview["state"];
  expires_at?: string;
  event?: {
    name: string;
    slug: string;
    event_date: string;
  };
};

function mapPreviewRpcPayload(payload: PreviewRpcPayload | null): InvitationPreview {
  if (!payload?.state || payload.state === "login_required") {
    return { state: "login_required" };
  }

  if (payload.state === "ready" && payload.event) {
    return {
      state: "ready",
      event: payload.event,
      expiresAt: payload.expires_at,
    };
  }

  if (
    payload.state === "expired" ||
    payload.state === "unavailable" ||
    payload.state === "wrong_account" ||
    payload.state === "disabled" ||
    payload.state === "already_used"
  ) {
    return { state: payload.state };
  }

  return { state: "unavailable" };
}

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
      (event.event_date != null && new Date(event.event_date) >= now),
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

export async function recordInvitationOpen(
  token: string,
  supabase?: ServerSupabase,
): Promise<void> {
  const client = supabase ?? (await createClient());
  const { error } = await client.rpc(
    "record_community_invitation_open_authenticated",
    { p_token: token },
  );
  if (error) {
    console.error("recordInvitationOpen:", error.message);
  }
}

export async function getInvitationAcceptPreview(
  token: string,
  userId: string | null,
  supabase?: ServerSupabase,
): Promise<InvitationPreview> {
  if (!userId) {
    return { state: "login_required" };
  }

  try {
    const client = supabase ?? (await createClient());
    const { data, error } = await client.rpc("preview_community_event_invitation", {
      p_token: token,
    });

    if (error) {
      console.error("getInvitationAcceptPreview:", error.message);
      return { state: "unavailable" };
    }

    return mapPreviewRpcPayload(data as PreviewRpcPayload | null);
  } catch (error) {
    console.error(
      "getInvitationAcceptPreview:",
      error instanceof Error ? error.message : "unknown error",
    );
    return { state: "unavailable" };
  }
}
