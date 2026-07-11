"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminStoreProductImageFields } from "@/components/store/admin/AdminStoreProductImageFields";
import {
  adminStoreFieldClass,
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import { upsertStoreProductAction } from "@/lib/store/actions";
import type { StoreProduct } from "@/lib/store/types";
import { STORE_CATEGORIES } from "@/lib/store/utils";
import { cn } from "@/lib/utils/cn";

type AdminStoreProductFormProps = {
  editingProduct: StoreProduct | null;
  onCancelEdit: () => void;
};

export function AdminStoreProductForm({
  editingProduct,
  onCancelEdit,
}: AdminStoreProductFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(
    editingProduct?.main_image_url ?? null,
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    editingProduct?.gallery_urls ?? [],
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const publicPrice = Number(formData.get("public_price") ?? 0);
    if (!Number.isFinite(publicPrice) || publicPrice < 0) {
      setError("Ingresá un precio público válido.");
      return;
    }

    const communityRaw = String(formData.get("community_price") ?? "").trim();
    const communityPrice = communityRaw ? Number(communityRaw) : null;

    const stockTotal = Number(formData.get("stock_total") ?? 0);

    startTransition(async () => {
      const result = await upsertStoreProductAction(editingProduct?.id ?? null, {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        category: String(formData.get("category") ?? "general"),
        description: String(formData.get("description") ?? "") || null,
        short_description: String(formData.get("short_description") ?? "") || null,
        public_price: publicPrice,
        community_price: communityPrice,
        main_image_url: mainImageUrl,
        gallery_urls: galleryUrls,
        is_active: formData.get("is_active") === "on",
        is_featured: formData.get("is_featured") === "on",
        community_only: formData.get("community_only") === "on",
        track_stock: true,
        stock_total: Number.isFinite(stockTotal) ? stockTotal : 0,
        status: formData.get("is_active") === "on" ? "active" : "inactive",
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar el producto.");
        return;
      }

      setSuccess(
        editingProduct ? "Producto actualizado correctamente." : "Producto creado correctamente.",
      );
      form.reset();
      if (editingProduct) {
        onCancelEdit();
      } else {
        setMainImageUrl(null);
        setGalleryUrls([]);
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">
            {editingProduct ? "Editar producto" : "Nuevo producto"}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Completá los datos y cargá las URLs de imagen antes de guardar.
          </p>
        </div>
        {editingProduct ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800"
          >
            Cancelar edición
          </button>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {editingProduct ? (
          <input type="hidden" name="product_id" value={editingProduct.id} />
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <AdminStoreField label="Nombre" htmlFor="name">
            <input
              id="name"
              name="name"
              required
              defaultValue={editingProduct?.name ?? ""}
              className={adminStoreFieldClass}
              placeholder="Ej. CLICS MODERNOS - BUZO BLANCO"
            />
          </AdminStoreField>
          <AdminStoreField label="Slug" htmlFor="slug">
            <input
              id="slug"
              name="slug"
              defaultValue={editingProduct?.slug ?? ""}
              className={adminStoreFieldClass}
              placeholder="clics-modernos-buzo-blanco"
            />
          </AdminStoreField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStoreField label="Categoría" htmlFor="category">
            <select
              id="category"
              name="category"
              defaultValue={editingProduct?.category ?? "general"}
              className={adminStoreFieldClass}
            >
              {STORE_CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </AdminStoreField>
          <AdminStoreField label="Precio público" htmlFor="public_price">
            <input
              id="public_price"
              name="public_price"
              type="number"
              min={0}
              required
              defaultValue={editingProduct?.public_price ?? ""}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          <AdminStoreField label="Precio comunidad" htmlFor="community_price">
            <input
              id="community_price"
              name="community_price"
              type="number"
              min={0}
              defaultValue={editingProduct?.community_price ?? ""}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          <AdminStoreField label="Stock total" htmlFor="stock_total">
            <input
              id="stock_total"
              name="stock_total"
              type="number"
              min={0}
              defaultValue={editingProduct?.stock_total ?? 0}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
        </div>

        <AdminStoreField label="Descripción corta" htmlFor="short_description">
          <input
            id="short_description"
            name="short_description"
            defaultValue={editingProduct?.short_description ?? ""}
            className={adminStoreFieldClass}
            placeholder="Resumen visible en catálogo"
          />
        </AdminStoreField>

        <AdminStoreField label="Descripción comercial" htmlFor="description">
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={editingProduct?.description ?? ""}
            className={cn(adminStoreFieldClass, "resize-y")}
            placeholder="Detalle del producto, materiales, talles..."
          />
        </AdminStoreField>

        <div className="flex flex-wrap gap-4 rounded-lg border border-zinc-800 bg-zinc-950/30 px-3 py-2.5">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={editingProduct?.is_active ?? true}
              className="rounded border-zinc-600"
            />
            Activo
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={editingProduct?.is_featured ?? false}
              className="rounded border-zinc-600"
            />
            Destacado
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="community_only"
              defaultChecked={editingProduct?.community_only ?? false}
              className="rounded border-zinc-600"
            />
            Solo comunidad
          </label>
        </div>

        <AdminStoreProductImageFields
          productId={editingProduct?.id ?? null}
          mainImageUrl={mainImageUrl}
          galleryUrls={galleryUrls}
          onMainImageChange={setMainImageUrl}
          onGalleryChange={setGalleryUrls}
        />

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
          >
            {pending
              ? "Guardando..."
              : editingProduct
                ? "Actualizar producto"
                : "Crear producto"}
          </button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
        </div>
      </form>
    </section>
  );
}
