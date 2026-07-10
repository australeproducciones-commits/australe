import type { Metadata } from "next";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminStoreProductsPanel } from "@/components/store/admin/AdminStoreProductsPanel";
import { AdminStoreNav } from "@/components/store/admin/AdminStoreNav";
import { ROUTES } from "@/lib/constants/routes";
import { getStoreProductsForAdmin } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "Admin · Tienda · Productos",
};

export default async function AdminTiendaProductosPage() {
  const products = await getStoreProductsForAdmin();

  return (
    <>
      <AdminHeader title="Productos de tienda" description="Merchandising oficial Australe." />
      <div className="px-4 py-8 sm:px-8">
        <AdminStoreNav currentPath={ROUTES.adminTiendaProductos} />
        <AdminStoreProductsPanel products={products} />
      </div>
    </>
  );
}
