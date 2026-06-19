import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminPartnersPanel } from "@/components/site/AdminPartnersPanel";
import { requireAdminPage } from "@/lib/events/queries";
import { getAllPartnersForAdmin } from "@/lib/site/queries";

export const metadata: Metadata = {
  title: "Admin · Partners",
};

export default async function AdminPartnersPage() {
  await requireAdminPage();
  const partners = await getAllPartnersForAdmin();

  return (
    <>
      <AdminHeader
        title="Partners"
        description="Administrá marcas y patrocinadores visibles antes del footer."
      />
      <div className="px-4 py-8 sm:px-8">
        <AdminPartnersPanel partners={partners} />
      </div>
    </>
  );
}
