import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStoreProductsPanel } from "@/components/store/admin/AdminStoreProductsPanel";
import { AdminStoreNav } from "@/components/store/admin/AdminStoreNav";
import { ROUTES } from "@/lib/constants/routes";
import { requireAdminPage } from "@/lib/events/queries";
import { buildDuplicateProductDraft } from "@/lib/store/duplicate";
import { getStoreAdminProductsPageData } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "Admin · Tienda · Productos",
};

type AdminTiendaProductosPageProps = {
  searchParams: Promise<{
    duplicate?: string;
  }>;
};

export default async function AdminTiendaProductosPage({
  searchParams,
}: AdminTiendaProductosPageProps) {
  await requireAdminPage();
  const params = await searchParams;
  const pageData = await getStoreAdminProductsPageData();

  const duplicateId = params.duplicate?.trim() || null;
  const duplicateSource = duplicateId
    ? pageData.products.find((product) => product.id === duplicateId) ?? null
    : null;

  if (duplicateId && !duplicateSource) {
    notFound();
  }

  const duplicateContext = duplicateSource
    ? {
        sourceProductId: duplicateSource.id,
        sourceProductName: duplicateSource.name,
        draft: buildDuplicateProductDraft(duplicateSource),
      }
    : null;

  return (
    <>
      <AdminHeader title="Productos de tienda" description="Merchandising oficial Australe." />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreNav currentPath={ROUTES.adminTiendaProductos} />
        <AdminStoreProductsPanel pageData={pageData} duplicateContext={duplicateContext} />
      </div>
    </>
  );
}
