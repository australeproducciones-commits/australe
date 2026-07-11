import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStoreHeroSettingsPanel } from "@/components/store/admin/AdminStoreHeroSettingsPanel";
import { requireAdminPage } from "@/lib/events/queries";
import { getStoreHeroSettingsForAdmin } from "@/lib/store/settings/queries";

export const metadata: Metadata = {
  title: "Admin · Hero de la tienda",
};

export default async function AdminStoreHeroSettingsPage() {
  await requireAdminPage();
  const settings = await getStoreHeroSettingsForAdmin();

  return (
    <>
      <AdminHeader
        title="Hero de la tienda"
        description="Campaña editorial del merchandising oficial en la tienda pública."
      />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreHeroSettingsPanel initialSettings={settings} />
      </div>
    </>
  );
}
