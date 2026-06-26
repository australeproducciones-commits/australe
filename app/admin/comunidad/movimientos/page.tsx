import type { Metadata } from "next";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunityTransactionsTable } from "@/components/admin/community/AdminCommunityTransactionsTable";
import { getAdminLoyaltyTransactions } from "@/lib/community/loyalty/admin-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Movimientos",
};

export default async function AdminComunidadMovimientosPage() {
  await requireAdminPage();
  const transactions = await getAdminLoyaltyTransactions();

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Historial global de movimientos de puntos."
    >
      <AdminCommunityTransactionsTable transactions={transactions} />
    </AdminCommunityShell>
  );
}
