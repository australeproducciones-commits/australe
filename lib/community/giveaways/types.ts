export const GIVEAWAY_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  CLOSED: "closed",
  DRAWN: "drawn",
  CANCELLED: "cancelled",
} as const;

export type GiveawayStatus =
  (typeof GIVEAWAY_STATUS)[keyof typeof GIVEAWAY_STATUS];

export const GIVEAWAY_ENTRY_TYPE = {
  FREE: "free",
  POINTS: "points",
  TICKET: "ticket",
  ATTENDANCE: "attendance",
  STORE_PURCHASE: "store_purchase",
  AUTOMATIC: "automatic",
  MIXED: "mixed",
} as const;

export type GiveawayEntryType =
  (typeof GIVEAWAY_ENTRY_TYPE)[keyof typeof GIVEAWAY_ENTRY_TYPE];

export const GIVEAWAY_ENTRY_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  DISQUALIFIED: "disqualified",
  REFUNDED: "refunded",
} as const;

export type GiveawayEntryStatus =
  (typeof GIVEAWAY_ENTRY_STATUS)[keyof typeof GIVEAWAY_ENTRY_STATUS];

export const GIVEAWAY_WINNER_TYPE = {
  WINNER: "winner",
  ALTERNATE: "alternate",
} as const;

export type GiveawayWinnerType =
  (typeof GIVEAWAY_WINNER_TYPE)[keyof typeof GIVEAWAY_WINNER_TYPE];

export const GIVEAWAY_WINNER_STATUS = {
  SELECTED: "selected",
  NOTIFIED: "notified",
  CLAIMED: "claimed",
  EXPIRED: "expired",
  REJECTED: "rejected",
  REPLACED: "replaced",
} as const;

export type GiveawayWinnerStatus =
  (typeof GIVEAWAY_WINNER_STATUS)[keyof typeof GIVEAWAY_WINNER_STATUS];

export type LevelBonusConfig = {
  default_quantity?: number;
  by_level_id?: Record<string, number>;
};

export type CommunityGiveaway = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  prize_description: string;
  image_url: string | null;
  terms_and_conditions: string | null;
  status: GiveawayStatus;
  entry_type: GiveawayEntryType;
  points_cost: number;
  max_entries_per_user: number | null;
  allow_multiple_entries: boolean;
  winner_count: number;
  alternate_count: number;
  starts_at: string | null;
  closes_at: string | null;
  draw_at: string | null;
  claim_deadline: string | null;
  related_event_id: string | null;
  requires_valid_ticket: boolean;
  requires_used_ticket: boolean;
  minimum_purchase_amount: number | null;
  minimum_community_level: string | null;
  level_bonus_config: LevelBonusConfig;
  is_public: boolean;
  allow_duplicate_winners: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  drawn_at: string | null;
  cancelled_at: string | null;
};

export type CommunityGiveawayEntry = {
  id: string;
  giveaway_id: string;
  user_id: string;
  community_member_id: string | null;
  entry_quantity: number;
  source_type: string;
  source_reference_id: string | null;
  points_transaction_id: string | null;
  status: GiveawayEntryStatus;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CommunityGiveawayWinner = {
  id: string;
  giveaway_id: string;
  user_id: string;
  entry_id: string | null;
  position: number;
  winner_type: GiveawayWinnerType;
  status: GiveawayWinnerStatus;
  selected_at: string;
  notified_at: string | null;
  claimed_at: string | null;
  expired_at: string | null;
  verification_code: string;
  metadata: Record<string, unknown>;
  public_display_name?: string | null;
};

export type CommunityGiveawayAuditLog = {
  id: string;
  giveaway_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  previous_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type GiveawayListItem = CommunityGiveaway & {
  participant_count?: number;
  total_chances?: number;
};

export type GiveawayUserParticipation = {
  total_entries: number;
  total_chances: number;
  entries: CommunityGiveawayEntry[];
  is_winner: boolean;
  is_alternate: boolean;
  winner_record: CommunityGiveawayWinner | null;
};

export type GiveawayEligibility = {
  eligible: boolean;
  reason?: string;
  can_enter_manually: boolean;
  points_balance: number;
  user_chances: number;
  max_reached: boolean;
  insufficient_points: boolean;
};

export type GiveawayActionResult = {
  success: boolean;
  error?: string;
  entry_id?: string;
  entry_quantity?: number;
  points_spent?: number;
  points_balance_after?: number;
  total_user_chances?: number;
};

export type GiveawayDrawResult = {
  success: boolean;
  error?: string;
  already_drawn?: boolean;
  winners?: number;
  alternates?: number;
  participants?: number;
  total_chances?: number;
  draw_seed_hash?: string;
};

export type GiveawayAdminParticipant = {
  entry_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  entry_quantity: number;
  source_type: string;
  status: GiveawayEntryStatus;
  points_spent: number;
  created_at: string;
};

export type GiveawayFormInput = {
  name: string;
  slug: string;
  short_description?: string;
  description?: string;
  prize_description: string;
  image_url?: string | null;
  terms_and_conditions?: string;
  status?: GiveawayStatus;
  entry_type: GiveawayEntryType;
  points_cost?: number;
  max_entries_per_user?: number | null;
  allow_multiple_entries?: boolean;
  winner_count?: number;
  alternate_count?: number;
  starts_at?: string | null;
  closes_at?: string | null;
  draw_at?: string | null;
  claim_deadline?: string | null;
  related_event_id?: string | null;
  requires_valid_ticket?: boolean;
  requires_used_ticket?: boolean;
  minimum_purchase_amount?: number | null;
  minimum_community_level?: string | null;
  level_bonus_config?: LevelBonusConfig;
  is_public?: boolean;
  allow_duplicate_winners?: boolean;
};
