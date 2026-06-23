import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminQueryErrorCard } from "@/components/admin/AdminQueryErrorCard";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { AdminProductsPanel } from "@/components/products/AdminProductsPanel";
import {
  getProductCategoriesForAdmin,
  getProductsDashboardStats,
  getProductsForAdmin,
} from "@/lib/products/queries";
import type {
  GlobalProduct,
  ProductCategory,
  ProductDashboardStats,
} from "@/lib/products/types";
import { isSupabaseQueryError } from "@/lib/supabase/queryError";

export const metadata: Metadata = {
  title: "Admin · Productos",
};

type AdminProductosPageProps = {
  searchParams: Promise<{
    q?: string;
    sku?: string;
    category?: string;
    lowStock?: string;
    used?: string;
    hideInactive?: string;
  }>;
};

export default async function AdminProductosPage({
  searchParams,
}: AdminProductosPageProps) {
  const params = await searchParams;
  const hideInactive = params.hideInactive !== "0";

  let products: GlobalProduct[] = [];
  let categories: ProductCategory[] = [];
  let stats: ProductDashboardStats | null = null;
  let loadError: string | null = null;

  try {
    [products, categories, stats] = await Promise.all([
      getProductsForAdmin({
        q: params.q,
        sku: params.sku,
        categoryId: params.category ?? null,
        lowStockOnly: params.lowStock === "1",
        usedInEventsOnly: params.used === "1",
        hideInactive,
      }),
      getProductCategoriesForAdmin(),
      getProductsDashboardStats(),
    ]);
  } catch (error) {
    if (isSupabaseQueryError(error)) {
      loadError = error.userMessage;
    } else {
      throw error;
    }
  }

  if (loadError || !stats) {
    return (
      <>
        <AdminHeader
          title="Productos"
          description="Administrá el catálogo y el stock general de consumiciones."
        />
        <div className="px-4 py-8 sm:px-8">
          <AdminQueryErrorCard
            title="No se pudieron cargar los productos"
            message={loadError ?? "Error desconocido al cargar productos."}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader
        title="Productos"
        description="Administrá el catálogo y el stock general de consumiciones."
      />
      <div className="px-4 py-8 sm:px-8">
        <Suspense fallback={<p className="text-zinc-400">Cargando productos…</p>}>
          <AdminProductsPanel
            products={products}
            categories={categories}
            stats={stats}
            initialHideInactive={hideInactive}
          />
        </Suspense>
      </div>
    </>
  );
}
