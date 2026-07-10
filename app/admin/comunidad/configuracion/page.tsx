import type { Metadata } from "next";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminCommunitySettingsPanel } from "@/components/admin/community/AdminCommunitySettingsPanel";
import { getAdminCommunitySettings } from "@/lib/community/loyalty/admin-queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Configuración",
};

export default async function AdminComunidadConfiguracionPage() {
  await requireAdminPage();
  const settings = await getAdminCommunitySettings();

  const defaultSettings = {
    id: 1,
    community_enabled: true,
    ticket_points_enabled: true,
    consumption_points_enabled: false,
    amount_per_point: 1000,
    welcome_points: 0,
    public_title: "Comunidad Australe",
    public_description: "",
  };

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Configuración del programa de fidelización."
    >
      <AdminCommunitySettingsPanel settings={settings ?? defaultSettings} />
    </AdminCommunityShell>
  );
}
