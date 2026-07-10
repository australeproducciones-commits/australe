import type { Metadata } from "next";
import Link from "next/link";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminAdvertisingCampaignForm } from "@/components/admin/advertising/AdminAdvertisingCampaignForm";
import { ROUTES } from "@/lib/constants/routes";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Nueva publicidad",
};

export default async function AdminComunidadPublicidadNuevaPage() {
  await requireAdminPage();

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Crear una nueva campaña publicitaria."
    >
      <div className="admin-ad-scada-page">
        <Link
          href={ROUTES.adminComunidadPublicidad}
          className="admin-ad-scada-back"
        >
          ← Volver a publicidad
        </Link>
        <AdminAdvertisingCampaignForm />
      </div>
    </AdminCommunityShell>
  );
}
