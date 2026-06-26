import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTES } from "@/lib/constants/routes";
import { ROLES } from "@/lib/constants/roles";
import {
  TICKET_PAYMENT_STATUS,
  TICKET_STATUS,
} from "@/lib/ticket-sales/types";
import { isConfirmedSale } from "@/lib/ticket-sales/saleStatus";
import { LOYALTY_TRANSACTION_TYPE } from "@/lib/community/loyalty/types";
import { INVITATION_STATUS } from "@/lib/community/invitations/types";
import type {
  CommunityUserActivityItem,
  CommunityUserProfile,
  CommunityUserTicketRow,
} from "@/lib/community/admin/types";
import type { CommunityEventInvitation } from "@/lib/community/invitations/types";
import type { LoyaltyTransaction } from "@/lib/community/loyalty/types";
import { fetchAuthEmailsByIds } from "@/lib/users/authEmails";

export async function getCommunityUserProfile(
  userId: string,
): Promise<CommunityUserProfile | null> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, full_name, whatsapp, created_at, is_active, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile || profile.role !== ROLES.CUSTOMER) {
    return null;
  }

  const [
    { data: member },
    { data: loyalty },
    { data: tickets },
    { data: transactions },
    { count: redemptionsCount },
    { data: invitations },
    emailMap,
  ] = await Promise.all([
    admin
      .from("community_members")
      .select("status, dni, whatsapp, created_at")
      .eq("profile_id", userId)
      .maybeSingle(),
    admin
      .from("loyalty_accounts")
      .select("points_balance, lifetime_points, current_level_id")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("tickets")
      .select(
        "id, event_id, ticket_type_id, price_paid, ticket_status, payment_status, used_at, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("loyalty_transactions")
      .select(
        "id, transaction_type, points, balance_after, description, created_at, source_type",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    admin
      .from("community_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("status", "eq", "cancelled"),
    admin
      .from("community_event_invitations")
      .select("status, opened_at, accepted_at, used_at")
      .eq("user_id", userId),
    fetchAuthEmailsByIds([userId]),
  ]);

  let levelName: string | null = null;
  if (loyalty?.current_level_id) {
    const { data: level } = await admin
      .from("community_levels")
      .select("name")
      .eq("id", loyalty.current_level_id)
      .maybeSingle();
    levelName = level?.name ?? null;
  }

  const ticketRows = tickets ?? [];
  let purchaseCount = 0;
  let totalSpent = 0;
  let ticketsAcquired = 0;
  let ticketsUsed = 0;
  const attendedEvents = new Set<string>();
  let lastPurchaseAt: string | null = null;
  let lastAttendanceAt: string | null = null;

  for (const t of ticketRows) {
    if (isConfirmedSale(t.ticket_status, t.payment_status)) {
      purchaseCount += 1;
      ticketsAcquired += 1;
      totalSpent += Number(t.price_paid ?? 0);
      if (!lastPurchaseAt || t.created_at > lastPurchaseAt) {
        lastPurchaseAt = t.created_at;
      }
    }
    if (
      t.ticket_status === TICKET_STATUS.USED &&
      t.payment_status === TICKET_PAYMENT_STATUS.CONFIRMED
    ) {
      ticketsUsed += 1;
      attendedEvents.add(t.event_id);
      if (t.used_at && (!lastAttendanceAt || t.used_at > lastAttendanceAt)) {
        lastAttendanceAt = t.used_at;
      }
    }
  }

  const txRows = (transactions ?? []) as Pick<
    LoyaltyTransaction,
    "transaction_type" | "points"
  >[];
  const pointsUsed = Math.abs(
    txRows
      .filter((tx) => tx.transaction_type === LOYALTY_TRANSACTION_TYPE.REDEEM)
      .reduce((sum, tx) => sum + tx.points, 0),
  );
  const manualAdjustments = txRows.filter(
    (tx) => tx.transaction_type === LOYALTY_TRANSACTION_TYPE.ADJUSTMENT,
  ).length;

  const invRows = (invitations ?? []) as Pick<
    CommunityEventInvitation,
    "status" | "opened_at" | "accepted_at" | "used_at"
  >[];

  const invitationStats = {
    sent: invRows.length,
    pending: invRows.filter(
      (i) =>
        i.status === INVITATION_STATUS.DRAFT ||
        i.status === INVITATION_STATUS.PREPARED,
    ).length,
    opened: invRows.filter((i) => i.opened_at !== null).length,
    accepted: invRows.filter((i) => i.accepted_at !== null).length,
    used: invRows.filter((i) => i.used_at !== null).length,
  };

  return {
    userId,
    fullName: profile.full_name,
    email: emailMap.get(userId) ?? null,
    whatsapp: member?.whatsapp ?? profile.whatsapp,
    dni: member?.dni ?? null,
    registeredAt: member?.created_at ?? profile.created_at,
    status: member?.status ?? "active",
    isActive: profile.is_active,
    levelName,
    loyalty: {
      pointsBalance: loyalty?.points_balance ?? 0,
      lifetimeEarned: loyalty?.lifetime_points ?? 0,
      pointsUsed,
      manualAdjustments,
      redemptionsCount: redemptionsCount ?? 0,
    },
    tickets: {
      purchaseCount,
      totalSpent,
      ticketsAcquired,
      ticketsUsed,
      eventsAttended: attendedEvents.size,
      lastPurchaseAt,
      lastAttendanceAt,
    },
    invitations: invitationStats,
  };
}

export async function getCommunityUserTickets(
  userId: string,
  limit = 50,
): Promise<CommunityUserTicketRow[]> {
  const admin = createAdminClient();
  const { data: tickets, error } = await admin
    .from("tickets")
    .select(
      "id, event_id, ticket_type_id, price_paid, ticket_status, payment_status, used_at, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getCommunityUserTickets:", error.message);
    return [];
  }

  const eventIds = [...new Set((tickets ?? []).map((t) => t.event_id))];
  const typeIds = [
    ...new Set(
      (tickets ?? [])
        .map((t) => t.ticket_type_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [{ data: events }, { data: types }] = await Promise.all([
    eventIds.length
      ? admin.from("events").select("id, name, slug").in("id", eventIds)
      : Promise.resolve({ data: [] }),
    typeIds.length
      ? admin.from("ticket_types").select("id, name").in("id", typeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const eventById = new Map((events ?? []).map((e) => [e.id, e]));
  const typeById = new Map((types ?? []).map((t) => [t.id, t]));

  return (tickets ?? []).map((t) => {
    const event = eventById.get(t.event_id);
    const type = t.ticket_type_id ? typeById.get(t.ticket_type_id) : null;
    return {
      id: t.id,
      eventId: t.event_id,
      eventName: event?.name ?? "Evento",
      eventSlug: event?.slug ?? "",
      ticketTypeName: type?.name ?? null,
      createdAt: t.created_at,
      pricePaid: Number(t.price_paid ?? 0),
      ticketStatus: t.ticket_status,
      paymentStatus: t.payment_status,
      usedAt: t.used_at,
    };
  });
}

export async function getCommunityUserLoyaltyTransactions(
  userId: string,
  limit = 50,
): Promise<LoyaltyTransaction[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("loyalty_transactions")
    .select(
      "id, user_id, transaction_type, points, balance_after, source_type, source_id, description, created_at",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getCommunityUserLoyaltyTransactions:", error.message);
    return [];
  }

  return (data ?? []) as LoyaltyTransaction[];
}

export async function getCommunityUserRedemptions(userId: string, limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_redemptions")
    .select("id, reward_id, points_spent, status, created_at, redeemed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getCommunityUserRedemptions:", error.message);
    return [];
  }

  const rewardIds = [
    ...new Set((data ?? []).map((row) => row.reward_id)),
  ];
  const { data: rewards } = rewardIds.length
    ? await admin.from("community_rewards").select("id, name").in("id", rewardIds)
    : { data: [] as { id: string; name: string }[] };

  const rewardById = new Map((rewards ?? []).map((r) => [r.id, r]));

  return (data ?? []).map((row) => ({
    ...row,
    reward: rewardById.get(row.reward_id) ?? null,
  }));
}

export async function getCommunityUserInvitations(userId: string, limit = 50) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_event_invitations")
    .select(
      "id, event_id, invitation_type, channel, status, message, created_at, sent_at, opened_at, created_by, public_token",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getCommunityUserInvitations:", error.message);
    return [];
  }

  const eventIds = [...new Set((data ?? []).map((i) => i.event_id))];
  const creatorIds = [
    ...new Set(
      (data ?? []).map((i) => i.created_by).filter((id): id is string => !!id),
    ),
  ];

  const [{ data: events }, { data: creators }] = await Promise.all([
    eventIds.length
      ? admin.from("events").select("id, name").in("id", eventIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? admin.from("profiles").select("id, full_name").in("id", creatorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const eventById = new Map((events ?? []).map((e) => [e.id, e]));
  const creatorById = new Map((creators ?? []).map((c) => [c.id, c]));

  return (data ?? []).map((row) => ({
    ...row,
    eventName: eventById.get(row.event_id)?.name ?? "Evento",
    creatorName: row.created_by
      ? creatorById.get(row.created_by)?.full_name ?? null
      : null,
  }));
}

export async function getCommunityUserActivity(
  userId: string,
  limit = 40,
): Promise<CommunityUserActivityItem[]> {
  const profile = await getCommunityUserProfile(userId);
  if (!profile) {
    return [];
  }

  const [tickets, transactions, redemptions, invitations] = await Promise.all([
    getCommunityUserTickets(userId, 30),
    getCommunityUserLoyaltyTransactions(userId, 30),
    getCommunityUserRedemptions(userId, 30),
    getCommunityUserInvitations(userId, 30),
  ]);

  const items: CommunityUserActivityItem[] = [
    {
      id: `reg-${userId}`,
      type: "registered",
      label: "Registro en la comunidad",
      detail: null,
      occurredAt: profile.registeredAt,
    },
  ];

  for (const ticket of tickets) {
    if (isConfirmedSale(ticket.ticketStatus, ticket.paymentStatus)) {
      items.push({
        id: `purchase-${ticket.id}`,
        type: "purchase",
        label: `Compra · ${ticket.eventName}`,
        detail: ticket.ticketTypeName,
        occurredAt: ticket.createdAt,
      });
    } else if (
      ticket.ticketStatus === TICKET_STATUS.RESERVED &&
      ticket.paymentStatus === TICKET_PAYMENT_STATUS.PENDING
    ) {
      items.push({
        id: `reservation-${ticket.id}`,
        type: "reservation",
        label: `Reserva · ${ticket.eventName}`,
        detail: ticket.ticketTypeName,
        occurredAt: ticket.createdAt,
      });
    }
    if (ticket.usedAt) {
      items.push({
        id: `used-${ticket.id}`,
        type: "ticket_used",
        label: `Asistencia · ${ticket.eventName}`,
        detail: null,
        occurredAt: ticket.usedAt,
      });
    }
  }

  for (const tx of transactions) {
    const type =
      tx.transaction_type === LOYALTY_TRANSACTION_TYPE.EARN
        ? "points_earn"
        : tx.transaction_type === LOYALTY_TRANSACTION_TYPE.REDEEM
          ? "points_redeem"
          : "points_adjustment";
    items.push({
      id: `tx-${tx.id}`,
      type,
      label: tx.description ?? tx.transaction_type,
      detail: `${tx.points > 0 ? "+" : ""}${tx.points} pts`,
      occurredAt: tx.created_at,
    });
  }

  for (const redemption of redemptions) {
    const reward = redemption.reward as { name?: string } | null;
    items.push({
      id: `redemption-${redemption.id}`,
      type: "redemption",
      label: `Canje · ${reward?.name ?? "Recompensa"}`,
      detail: `${redemption.points_spent} pts`,
      occurredAt: redemption.created_at,
    });
  }

  for (const invitation of invitations) {
    items.push({
      id: `invitation-${invitation.id}`,
      type: "invitation",
      label: `Invitación · ${invitation.eventName}`,
      detail: invitation.channel,
      occurredAt: invitation.created_at,
    });
  }

  return items
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit);
}

export function adminEventUrl(eventId: string): string {
  return ROUTES.adminEvento(eventId);
}
