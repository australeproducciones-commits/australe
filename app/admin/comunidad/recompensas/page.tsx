import type { Metadata } from "next";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunityRewardsPanel } from "@/components/admin/community/AdminCommunityRewardsPanel";
import { getAdminCommunityRewards } from "@/lib/community/loyalty/admin-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Recompensas",
};

export default async function AdminComunidadRecompensasPage() {
  await requireAdminPage();
  const rewards = await getAdminCommunityRewards();

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Gestioná recompensas canjeables por puntos."
    >
      <div id="crear">
        <AdminCommunityRewardsPanel rewards={rewards} />
      </div>
    </AdminCommunityShell>
  );
}
