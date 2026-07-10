"use client";

import { useRef, useState } from "react";
import { AdminStoreProductForm } from "@/components/store/admin/AdminStoreProductForm";
import { AdminStoreProductTable } from "@/components/store/admin/AdminStoreProductTable";
import type { StoreProduct } from "@/lib/store/types";

type AdminStoreProductsPanelProps = {
  products: StoreProduct[];
};

export function AdminStoreProductsPanel({ products }: AdminStoreProductsPanelProps) {
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  function handleEdit(product: StoreProduct) {
    setEditingProduct(product);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleCancelEdit() {
    setEditingProduct(null);
  }

  return (
    <div className="space-y-6">
      <div ref={formRef}>
        <AdminStoreProductForm
          key={editingProduct?.id ?? "new"}
          editingProduct={editingProduct}
          onCancelEdit={handleCancelEdit}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">
              Catálogo ({products.length})
            </h2>
            <p className="text-xs text-zinc-500">
              Miniaturas, stock disponible y acciones rápidas.
            </p>
          </div>
        </div>
        <AdminStoreProductTable products={products} onEdit={handleEdit} />
      </section>
    </div>
  );
}
