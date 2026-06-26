export const LOYALTY_TRANSACTION_TYPE = {
  EARN: "earn",
  REDEEM: "redeem",
  ADJUSTMENT: "adjustment",
  REVERSAL: "reversal",
  EXPIRATION: "expiration",
} as const;

export type LoyaltyTransactionType =
  (typeof LOYALTY_TRANSACTION_TYPE)[keyof typeof LOYALTY_TRANSACTION_TYPE];

export const REDEMPTION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  USED: "used",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
} as const;

export type RedemptionStatus =
  (typeof REDEMPTION_STATUS)[keyof typeof REDEMPTION_STATUS];

export type CommunitySettings = {
  id: number;
  community_enabled: boolean;
  ticket_points_enabled: boolean;
  consumption_points_enabled: boolean;
  amount_per_point: number;
  welcome_points: number;
  public_title: string;
  public_description: string;
};

export type CommunityLevel = {
  id: string;
  name: string;
  minimum_lifetime_points: number;
  description: string | null;
  benefits: unknown;
  sort_order: number;
  is_active: boolean;
};

export type LoyaltyAccount = {
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  current_level_id: string | null;
  updated_at: string;
};

export type LoyaltyTransaction = {
  id: string;
  user_id: string;
  transaction_type: LoyaltyTransactionType;
  points: number;
  balance_after: number;
  source_type: string;
  source_id: string | null;
  description: string | null;
  created_at: string;
};

export type CommunityReward = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  stock: number | null;
  event_id: string | null;
  reward_type: string;
  starts_at: string | null;
  ends_at: string | null;
  max_per_user: number | null;
  is_active: boolean;
};

export type CommunityRedemption = {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  redemption_code: string;
  status: RedemptionStatus;
  created_at: string;
  reward?: Pick<CommunityReward, "name" | "description">;
};

export type CommunityDashboard = {
  settings: CommunitySettings;
  account: LoyaltyAccount | null;
  level: CommunityLevel | null;
  nextLevel: CommunityLevel | null;
  transactions: LoyaltyTransaction[];
  rewards: CommunityReward[];
  redemptions: CommunityRedemption[];
  upcomingEvents: CommunityUpcomingEvent[];
};

export type CommunityUpcomingEvent = {
  ticketId: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  eventDate: string;
  ticketStatus: string;
};

export type AdminCommunitySummary = {
  activeMembers: number;
  newMembersThisMonth: number;
  pointsIssued: number;
  pointsRedeemed: number;
  pendingRedemptions: number;
  activeRewards: number;
  totalRegisteredUsers: number;
  recentActiveUsers: number;
  pointsInCirculation: number;
  completedRedemptions: number;
  invitationsSent: number;
  invitationsOpened: number;
  activeAdvertisingCampaigns: number;
};

export type AdminCommunityMember = {
  userId: string;
  fullName: string | null;
  email: string | null;
  joinedAt: string | null;
  pointsBalance: number;
  lifetimePoints: number;
  levelName: string | null;
  lastActivity: string | null;
  status: string;
};

export type LoyaltyActionResult = {
  success: boolean;
  error?: string;
  redemptionCode?: string;
};
