import type { Metadata } from "next";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminGiveawayForm } from "@/components/admin/community/AdminGiveawayForm";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Nuevo sorteo",
};

export default async function AdminComunidadSorteosNuevoPage() {
  await requireAdminPage();

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Creá un nuevo sorteo en borrador."
    >
      <AdminGiveawayForm />
    </AdminCommunityShell>
  );
}
