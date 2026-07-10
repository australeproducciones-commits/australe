import { createAdminClient } from "@/lib/supabase/admin";
import type { InvitationStatus } from "@/lib/community/invitations/types";
import { fetchAuthEmailsByIds } from "@/lib/users/authEmails";

const PAGE_SIZE = 25;

export type AdminInvitationListItem = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  eventId: string;
  eventName: string;
  eventSlug: string;
  invitationType: string;
  channel: string;
  status: InvitationStatus;
  createdAt: string;
  sentAt: string | null;
  openedAt: string | null;
  acceptedAt: string | null;
  usedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string;
};

export type AdminInvitationsPageResult = {
  items: AdminInvitationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminInvitationsQueryParams = {
  status?: string;
  eventId?: string;
  userId?: string;
  page?: number;
};

export async function searchAdminCommunityInvitations(
  params: AdminInvitationsQueryParams = {},
): Promise<AdminInvitationsPageResult> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = admin
    .from("community_event_invitations")
    .select(
      "id, user_id, event_id, invitation_type, channel, status, created_at, sent_at, opened_at, accepted_at, used_at, cancelled_at, expires_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });

  if (params.status?.trim()) {
    query = query.eq("status", params.status.trim());
  }
  if (params.eventId?.trim()) {
    query = query.eq("event_id", params.eventId.trim());
  }
  if (params.userId?.trim()) {
    query = query.eq("user_id", params.userId.trim());
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error("searchAdminCommunityInvitations:", error.message);
    return {
      items: [],
      total: 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages: 0,
    };
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const eventIds = [...new Set(rows.map((r) => r.event_id))];

  const [{ data: profiles }, { data: events }, emailMap] = await Promise.all([
    userIds.length
      ? admin.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    eventIds.length
      ? admin.from("events").select("id, name, slug").in("id", eventIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    fetchAuthEmailsByIds(userIds),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const eventById = new Map((events ?? []).map((e) => [e.id, e]));
  const total = count ?? 0;

  const items: AdminInvitationListItem[] = rows.map((row) => {
    const profile = profileById.get(row.user_id);
    const event = eventById.get(row.event_id);
    return {
      id: row.id,
      userId: row.user_id,
      userName: profile?.full_name ?? null,
      userEmail: emailMap.get(row.user_id) ?? null,
      eventId: row.event_id,
      eventName: event?.name ?? "Evento",
      eventSlug: event?.slug ?? "",
      invitationType: row.invitation_type,
      channel: row.channel,
      status: row.status as InvitationStatus,
      createdAt: row.created_at,
      sentAt: row.sent_at,
      openedAt: row.opened_at,
      acceptedAt: row.accepted_at,
      usedAt: row.used_at,
      cancelledAt: row.cancelled_at,
      expiresAt: row.expires_at,
    };
  });

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
