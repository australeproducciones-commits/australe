import { createAdminClient } from "@/lib/supabase/admin";
import { EVENT_STATUS } from "@/lib/constants/event-status";
import type { InviteableEvent } from "@/lib/community/invitations/types";

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
  const { data, error } = await admin
    .from("community_event_invitations")
    .select("id, user_id, status, created_at")
    .eq("event_id", eventId)
    .in("user_id", userIds)
    .is("cancelled_at", null)
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
