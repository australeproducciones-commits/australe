import type { Metadata } from "next";
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
    <div className="bg-zinc-950 px-4 py-6 sm:px-8">
      <AdminPartnersPanel partners={partners} />
    </div>
  );
}
