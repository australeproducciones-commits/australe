"use client";

import { useMemo, useRef, useState } from "react";
import { AdminStoreProductHubForm } from "@/components/store/admin/AdminStoreProductHubForm";
import { AdminStoreProductTable } from "@/components/store/admin/AdminStoreProductTable";
import type { AdminStoreProductsPageData } from "@/lib/store/types";

type AdminStoreProductsPanelProps = {
  pageData: AdminStoreProductsPageData;
};

export function AdminStoreProductsPanel({ pageData }: AdminStoreProductsPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const editingProduct = useMemo(
    () => pageData.products.find((p) => p.id === editingId) ?? null,
    [pageData.products, editingId],
  );

  function handleEdit(productId: string) {
    setEditingId(productId);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCancelEdit() {
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <div ref={formRef}>
        <AdminStoreProductHubForm
          key={editingProduct?.id ?? "new"}
          editingProduct={editingProduct}
          pageData={pageData}
          onCancelEdit={handleCancelEdit}
          onProductCreated={(id) => setEditingId(id)}
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
        />
      </section>
    </div>
  );
}
