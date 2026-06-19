import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminAdvertisingPanel } from "@/components/site/AdminAdvertisingPanel";
import { requireAdminPage } from "@/lib/events/queries";
import { getAllAdvertisingCampaignsForAdmin } from "@/lib/site/queries";

export const metadata: Metadata = {
  title: "Admin · Publicidad",
};

export default async function AdminPublicidadPage() {
  await requireAdminPage();
  const campaigns = await getAllAdvertisingCampaignsForAdmin();

  return (
    <>
      <AdminHeader
        title="Publicidad"
        description="Campañas del modal posterior al login con estadísticas básicas."
      />
      <div className="px-4 py-8 sm:px-8">
        <AdminAdvertisingPanel campaigns={campaigns} />
      </div>
    </>
  );
}
