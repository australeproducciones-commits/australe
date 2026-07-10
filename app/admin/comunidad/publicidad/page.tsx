import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCommunityShell } from "@/components/admin/community/AdminCommunityShell";
import { AdminAdvertisingScadaList } from "@/components/admin/advertising/AdminAdvertisingScadaList";
import {
  ADVERTISING_FILTER_STATUS,
  computeAdvertisingSummary,
  filterAndSortAdvertisingCampaigns,
  parseAdvertisingFilterStatus,
  parseAdvertisingSort,
} from "@/lib/site/advertising-display";
import { getAllAdvertisingCampaignsForAdmin } from "@/lib/site/queries";
import { requireAdminPage } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Admin · Comunidad · Publicidad",
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sort?: string;
  }>;
};

export default async function AdminComunidadPublicidadPage({
  searchParams,
}: PageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const search = params.search?.trim() ?? "";
  const status = parseAdvertisingFilterStatus(params.status);
  const sort = parseAdvertisingSort(params.sort);

  const allCampaigns = await getAllAdvertisingCampaignsForAdmin();
  const summary = computeAdvertisingSummary(allCampaigns);
  const campaigns = filterAndSortAdvertisingCampaigns(allCampaigns, {
    search,
    status,
    sort,
  });

  const hasFilters =
    Boolean(search) || status !== ADVERTISING_FILTER_STATUS.ALL;

  return (
    <AdminCommunityShell
      title="Comunidad"
      description="Gestión de la comunidad, fidelización y publicidad."
    >
      <Suspense fallback={<p className="admin-ad-scada-muted">Cargando…</p>}>
        <AdminAdvertisingScadaList
          campaigns={campaigns}
          summary={summary}
          initialSearch={search}
          initialStatus={status}
          initialSort={sort}
          hasFilters={hasFilters}
        />
      </Suspense>
    </AdminCommunityShell>
  );
}
