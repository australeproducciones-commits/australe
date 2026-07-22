import type { Metadata } from "next";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminGiveawayForm } from "@/components/admin/community/AdminGiveawayForm";
import { getCommunityLevelsForAdmin } from "@/lib/community/admin/user-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Nuevo sorteo",
};

export default async function AdminComunidadSorteosNuevoPage() {
  await requireAdminPage();
  const communityLevels = await getCommunityLevelsForAdmin();

  return (
    <AdminCommunityShell>
      <AdminGiveawayForm communityLevels={communityLevels} />
    </AdminCommunityShell>
  );
}
