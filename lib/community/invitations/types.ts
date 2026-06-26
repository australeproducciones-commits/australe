export const INVITATION_TYPE = {
  INFORMATIONAL: "informational",
  PURCHASE_LINK: "purchase_link",
} as const;

export type InvitationType =
  (typeof INVITATION_TYPE)[keyof typeof INVITATION_TYPE];

export const INVITATION_CHANNEL = {
  WHATSAPP: "whatsapp",
  EMAIL: "email",
  INTERNAL: "internal",
  MANUAL: "manual",
} as const;

export type InvitationChannel =
  (typeof INVITATION_CHANNEL)[keyof typeof INVITATION_CHANNEL];

export const INVITATION_STATUS = {
  DRAFT: "draft",
  PREPARED: "prepared",
  SENT: "sent",
  OPENED: "opened",
  ACCEPTED: "accepted",
  USED: "used",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  FAILED: "failed",
} as const;

export type InvitationStatus =
  (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

export type CommunityEventInvitation = {
  id: string;
  user_id: string;
  event_id: string;
  invitation_type: InvitationType;
  channel: InvitationChannel;
  status: InvitationStatus;
  message: string | null;
  public_token: string | null;
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  accepted_at: string | null;
  used_at: string | null;
  cancelled_at: string | null;
  expires_at: string;
  accepted_by: string | null;
  metadata: Record<string, unknown>;
};

export type InviteableEvent = {
  id: string;
  name: string;
  slug: string;
  event_date: string;
  location_name: string | null;
  status: string;
};

export type CreateInvitationsInput = {
  userIds: string[];
  eventId: string;
  invitationType: InvitationType;
  channel: InvitationChannel;
  message?: string;
  allowResend?: boolean;
};

export type CreateInvitationsResult = {
  success: boolean;
  error?: string;
  created: number;
  skippedDuplicate: number;
  skippedNoChannel: number;
  invitations: Array<{
    id: string;
    userId: string;
    status: InvitationStatus;
    whatsappUrl?: string;
    mailtoUrl?: string;
    trackingUrl?: string;
  }>;
};

export type AcceptInvitationResult =
  | { success: true; redirectTo: string }
  | { success: false; error: string };
