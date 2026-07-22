import type { Metadata } from "next";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminGiveawaysPanel } from "@/components/admin/community/AdminGiveawaysPanel";
import { getAdminGiveaways } from "@/lib/community/giveaways/queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Sorteos",
};

export default async function AdminComunidadSorteosPage() {
  await requireAdminPage();
  const giveaways = await getAdminGiveaways();

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Gestioná sorteos exclusivos para miembros de Comunidad."
    >
      <AdminGiveawaysPanel giveaways={giveaways} />
    </AdminCommunityShell>
  );
}
