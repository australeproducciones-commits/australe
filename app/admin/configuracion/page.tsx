import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminSiteSettingsPanel } from "@/components/site/AdminSiteSettingsPanel";
import { requireAdminPage } from "@/lib/events/queries";
import { getSiteSettings } from "@/lib/site/queries";

export const metadata: Metadata = {
  title: "Admin · Configuración",
};

export default async function AdminConfiguracionPage() {
  await requireAdminPage();
  const settings = await getSiteSettings();

  return (
    <>
      <AdminHeader
        title="Configuración del sitio"
        description="Contacto, WhatsApp e Instagram visibles en el footer."
      />
      <div className="px-4 py-8 sm:px-8">
        <AdminSiteSettingsPanel initialSettings={settings} />
      </div>
    </>
  );
}
