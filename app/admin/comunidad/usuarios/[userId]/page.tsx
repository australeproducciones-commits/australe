import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunityUserProfileClient } from "@/components/admin/community/AdminCommunityUserProfileClient";
import {
  getCommunityUserActivity,
  getCommunityUserInvitations,
  getCommunityUserLoyaltyTransactions,
  getCommunityUserProfile,
  getCommunityUserRedemptions,
  getCommunityUserTickets,
} from "@/lib/community/admin/user-profile-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Perfil",
};

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default async function AdminComunidadUsuarioPage({ params }: PageProps) {
  await requireAdminPage();
  const { userId } = await params;

  const profile = await getCommunityUserProfile(userId);
  if (!profile) {
    notFound();
  }

  const [activity, tickets, transactions, redemptions, invitations] =
    await Promise.all([
      getCommunityUserActivity(userId),
      getCommunityUserTickets(userId),
      getCommunityUserLoyaltyTransactions(userId),
      getCommunityUserRedemptions(userId),
      getCommunityUserInvitations(userId),
    ]);

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Perfil y actividad del usuario."
    >
      <AdminCommunityUserProfileClient
        profile={profile}
        activity={activity}
        tickets={tickets}
        transactions={transactions}
        redemptions={redemptions}
        invitations={invitations}
      />
    </AdminCommunityShell>
  );
}
