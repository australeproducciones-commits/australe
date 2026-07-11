"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdminStoreProductHubForm } from "@/components/store/admin/AdminStoreProductHubForm";
import { AdminStoreProductTable } from "@/components/store/admin/AdminStoreProductTable";
import { ROUTES } from "@/lib/constants/routes";
import type {
  AdminStoreProductsPageData,
  StoreProductDuplicateContext,
} from "@/lib/store/types";

type AdminStoreProductsPanelProps = {
  pageData: AdminStoreProductsPageData;
  duplicateContext?: StoreProductDuplicateContext | null;
};

export function AdminStoreProductsPanel({
  pageData,
  duplicateContext = null,
}: AdminStoreProductsPanelProps) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const editingProduct = useMemo(
    () => pageData.products.find((product) => product.id === editingId) ?? null,
    [pageData.products, editingId],
  );

  useEffect(() => {
    if (duplicateContext) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [duplicateContext]);

  function handleEdit(productId: string) {
    if (duplicateContext) {
      router.replace(ROUTES.adminTiendaProductos);
    }
    setEditingId(productId);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDuplicate(productId: string) {
    router.push(ROUTES.adminTiendaProductosDuplicate(productId));
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  function handleCancelDuplicate() {
    router.replace(ROUTES.adminTiendaProductos);
  }

  function handleProductCreated(productId: string) {
    setEditingId(productId);
    if (duplicateContext) {
      router.replace(ROUTES.adminTiendaProductos);
    }
  }

  return (
    <div className="space-y-6">
      <div ref={formRef}>
        <AdminStoreProductHubForm
          key={
            duplicateContext
              ? `duplicate-${duplicateContext.sourceProductId}`
              : editingProduct?.id ?? "new"
          }
          editingProduct={duplicateContext ? null : editingProduct}
          duplicateContext={duplicateContext}
          pageData={pageData}
          onCancelEdit={duplicateContext ? handleCancelDuplicate : handleCancelEdit}
          onProductCreated={handleProductCreated}
        />
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-white">
            Catálogo ({pageData.products.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Canales, variantes, stock y eventos en una vista.
          </p>
        </div>
        <AdminStoreProductTable
          products={pageData.products}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
        />
      </section>
    </div>
  );
}
