export const COMMUNITY_USERS_SORT = {
  REGISTERED_DESC: "registered_desc",
  REGISTERED_ASC: "registered_asc",
  NAME_ASC: "name_asc",
  POINTS_DESC: "points_desc",
  POINTS_ASC: "points_asc",
  PURCHASES_DESC: "purchases_desc",
  ACTIVITY_DESC: "activity_desc",
} as const;

export type CommunityUsersSort =
  (typeof COMMUNITY_USERS_SORT)[keyof typeof COMMUNITY_USERS_SORT];

export const COMMUNITY_USERS_FILTER = {
  ALL: "all",
  WITH_POINTS: "with_points",
  WITHOUT_POINTS: "without_points",
  WITH_PURCHASES: "with_purchases",
  WITHOUT_PURCHASES: "without_purchases",
  WITH_ATTENDANCE: "with_attendance",
  RECENT: "recent",
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type CommunityUsersFilter =
  (typeof COMMUNITY_USERS_FILTER)[keyof typeof COMMUNITY_USERS_FILTER];

export type CommunityUserListItem = {
  userId: string;
  fullName: string | null;
  email: string | null;
  whatsapp: string | null;
  dni: string | null;
  registeredAt: string;
  pointsBalance: number;
  purchaseCount: number;
  eventsAttended: number;
  lastActivity: string | null;
  status: string;
  isActive: boolean;
  levelId: string | null;
};

export type CommunityUsersPageResult = {
  items: CommunityUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CommunityUserTicketStats = {
  purchaseCount: number;
  totalSpent: number;
  ticketsAcquired: number;
  ticketsUsed: number;
  eventsAttended: number;
  lastPurchaseAt: string | null;
  lastAttendanceAt: string | null;
};

export type CommunityUserLoyaltyStats = {
  pointsBalance: number;
  lifetimeEarned: number;
  pointsUsed: number;
  manualAdjustments: number;
  redemptionsCount: number;
};

export type CommunityUserInvitationStats = {
  sent: number;
  pending: number;
  opened: number;
  accepted: number;
  used: number;
};

export type CommunityUserProfile = {
  userId: string;
  fullName: string | null;
  email: string | null;
  whatsapp: string | null;
  dni: string | null;
  registeredAt: string;
  status: string;
  isActive: boolean;
  levelName: string | null;
  loyalty: CommunityUserLoyaltyStats;
  tickets: CommunityUserTicketStats;
  invitations: CommunityUserInvitationStats;
};

export type CommunityUserTicketRow = {
  id: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  ticketTypeName: string | null;
  createdAt: string;
  pricePaid: number;
  ticketStatus: string;
  paymentStatus: string;
  usedAt: string | null;
};

export type CommunityUserActivityItem = {
  id: string;
  type:
    | "registered"
    | "purchase"
    | "reservation"
    | "ticket_used"
    | "points_earn"
    | "points_redeem"
    | "points_adjustment"
    | "redemption"
    | "invitation";
  label: string;
  detail: string | null;
  occurredAt: string;
};
