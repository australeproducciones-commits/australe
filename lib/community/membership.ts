import { createClient } from "@/lib/supabase/server";

export const COMMUNITY_MEMBER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLOCKED: "blocked",
  PENDING: "pending",
} as const;

export type CommunityMemberStatus =
  (typeof COMMUNITY_MEMBER_STATUS)[keyof typeof COMMUNITY_MEMBER_STATUS];

export type ActiveCommunityMember = {
  id: string;
  status: CommunityMemberStatus;
  full_name: string;
};

/** Estados que permiten acceder a eventos exclusivos de comunidad. */
const AUTHORIZED_STATUSES = new Set<string>([
  COMMUNITY_MEMBER_STATUS.ACTIVE,
]);

export async function getCommunityMemberForProfile(
  profileId: string,
): Promise<ActiveCommunityMember | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("community_members")
    .select("id, status, full_name")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getCommunityMemberForProfile:", error);
    return null;
  }

  return data as ActiveCommunityMember | null;
}

export async function isActiveCommunityMember(
  profileId: string | null | undefined,
): Promise<boolean> {
  if (!profileId) {
    return false;
  }

  const member = await getCommunityMemberForProfile(profileId);
  return member != null && AUTHORIZED_STATUSES.has(member.status);
}

export function isAuthorizedCommunityStatus(status: string): boolean {
  return AUTHORIZED_STATUSES.has(status);
}
