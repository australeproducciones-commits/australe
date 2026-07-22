import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminAdvertisingCampaignForm } from "@/components/admin/advertising/AdminAdvertisingCampaignForm";
import { ROUTES } from "@/lib/constants/routes";
import { requireAdminPage } from "@/lib/events/queries";
import { getAllAdvertisingCampaignsForAdmin } from "@/lib/site/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Editar publicidad",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminComunidadPublicidadEditarPage({
  params,
}: PageProps) {
  await requireAdminPage();
  const { id } = await params;
  const campaigns = await getAllAdvertisingCampaignsForAdmin();
  const campaign = campaigns.find((item) => item.id === id);

  if (!campaign) {
    notFound();
  }

  return (
    <AdminCommunityShell>
      <div className="admin-ad-scada-page">
        <Link href={ROUTES.adminComunidadPublicidad} className="admin-ad-scada-back">
          ← Volver a publicidad
        </Link>
        <AdminAdvertisingCampaignForm campaign={campaign} />
      </div>
    </AdminCommunityShell>
  );
}
