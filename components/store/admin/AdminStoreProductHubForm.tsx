"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AdminStoreChannelChips,
  AdminStoreWarnings,
} from "@/components/store/admin/AdminStoreChannelChips";
import {
  adminStoreFieldClass,
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import { AdminStoreProductEventsSection } from "@/components/store/admin/AdminStoreProductEventsSection";
import { AdminStoreProductImageFields } from "@/components/store/admin/AdminStoreProductImageFields";
import { AdminStoreProductVariantsSection } from "@/components/store/admin/AdminStoreProductVariantsSection";
import { buildStorePricePreview } from "@/lib/store/adminHub";
import { upsertStoreProductAction } from "@/lib/store/actions";
import type {
  AdminStoreProductListItem,
  AdminStoreProductsPageData,
} from "@/lib/store/types";
import { STORE_CATEGORIES, formatStorePrice } from "@/lib/store/utils";
import { cn } from "@/lib/utils/cn";

type HubTab = "general" | "images" | "variants" | "channels" | "events";

type AdminStoreProductHubFormProps = {
  editingProduct: AdminStoreProductListItem | null;
  pageData: AdminStoreProductsPageData;
  onCancelEdit: () => void;
  onProductCreated?: (productId: string) => void;
};

export function AdminStoreProductHubForm({
  editingProduct,
  pageData,
  onCancelEdit,
  onProductCreated,
}: AdminStoreProductHubFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<HubTab>("general");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(
    editingProduct?.main_image_url ?? null,
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    editingProduct?.gallery_urls ?? [],
  );

  const productId = editingProduct?.id ?? null;
  const channel = editingProduct?.channel;
  const pricePreview = editingProduct
    ? buildStorePricePreview({ product: editingProduct })
    : [];

  const tabs: { id: HubTab; label: string; disabled?: boolean }[] = [
    { id: "general", label: "General" },
    { id: "images", label: "Imágenes" },
    { id: "variants", label: "Variantes", disabled: !productId },
    { id: "channels", label: "Canales", disabled: !productId },
    { id: "events", label: "Eventos", disabled: !productId },
  ];

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
    const hasVariants = (editingProduct?.variants.length ?? 0) > 0;
    const stockTotal = hasVariants
      ? editingProduct?.stock_total ?? 0
      : Number(formData.get("stock_total") ?? 0);

    startTransition(async () => {
      const result = await upsertStoreProductAction(productId, {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        sku: String(formData.get("sku") ?? "") || null,
        category: String(formData.get("category") ?? "general"),
        description: String(formData.get("description") ?? "") || null,
        short_description: String(formData.get("short_description") ?? "") || null,
        public_price: publicPrice,
        community_price: communityPrice,
        main_image_url: mainImageUrl,
        gallery_urls: galleryUrls,
        is_active: formData.get("is_active") === "on",
        is_featured: formData.get("is_featured") === "on",
        show_in_store: formData.get("show_in_store") === "on",
        community_only: formData.get("community_only") === "on",
        track_stock: true,
        stock_total: Number.isFinite(stockTotal) ? stockTotal : 0,
        status: formData.get("is_active") === "on" ? "active" : "inactive",
        available_from: String(formData.get("available_from") ?? "") || null,
        available_until: String(formData.get("available_until") ?? "") || null,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar el producto.");
        return;
      }

      setSuccess(
        productId ? "Producto actualizado correctamente." : "Producto creado correctamente.",
      );

      if (!productId && result.id) {
        onProductCreated?.(result.id);
        setTab("variants");
      }

      router.refresh();
    });
  }

  function handleSaveImages() {
    if (!editingProduct) {
      setError("Creá el producto desde la pestaña General antes de guardar imágenes.");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await upsertStoreProductAction(editingProduct.id, {
        name: editingProduct.name,
        slug: editingProduct.slug,
        sku: editingProduct.sku,
        category: editingProduct.category,
        description: editingProduct.description,
        short_description: editingProduct.short_description,
        public_price: editingProduct.public_price,
        community_price: editingProduct.community_price,
        main_image_url: mainImageUrl,
        gallery_urls: galleryUrls,
        is_active: editingProduct.is_active,
        is_featured: editingProduct.is_featured,
        show_in_store: editingProduct.show_in_store,
        community_only: editingProduct.community_only,
        track_stock: editingProduct.track_stock,
        stock_total: editingProduct.stock_total,
        status: editingProduct.status,
        available_from: editingProduct.available_from,
        available_until: editingProduct.available_until,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudieron guardar las imágenes.");
        return;
      }

      setSuccess("Imágenes guardadas correctamente.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <div className="border-b border-zinc-800 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              {editingProduct ? "Editar producto" : "Nuevo producto"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Centro de control: datos, variantes, canales y eventos.
            </p>
            {channel ? (
              <div className="mt-2 space-y-2">
                <AdminStoreChannelChips chips={channel.chips} />
                <p className="text-xs text-zinc-400">{channel.summary}</p>
              </div>
            ) : null}
          </div>
          {editingProduct ? (
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar edición
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => setTab(item.id)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition",
                tab === item.id
                  ? "bg-violet-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                item.disabled && "cursor-not-allowed opacity-40",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {channel ? <AdminStoreWarnings warnings={channel.warnings} /> : null}

        {tab === "variants" && productId && editingProduct ? (
          <AdminStoreProductVariantsSection
            product={editingProduct}
            onChanged={() => router.refresh()}
          />
        ) : null}

        {tab === "events" && productId && editingProduct ? (
          <AdminStoreProductEventsSection
            product={editingProduct}
            pageData={pageData}
            onChanged={() => router.refresh()}
          />
        ) : null}

        {tab === "channels" && editingProduct ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Los canales se calculan desde el estado del producto y sus asociaciones.
              Guardá los cambios en la pestaña General.
            </p>
            <AdminStoreChannelChips chips={channel?.chips ?? []} />
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <dt className="text-xs text-zinc-500">Tienda general</dt>
                <dd className="mt-1 text-sm text-white">
                  {editingProduct.show_in_store ? "Visible" : "Oculta"}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <dt className="text-xs text-zinc-500">Eventos activos</dt>
                <dd className="mt-1 text-sm text-white">
                  {channel?.activeAssociationCount ?? 0}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <dt className="text-xs text-zinc-500">Stock disponible</dt>
                <dd className="mt-1 text-sm text-white">
                  {channel?.availableStock ?? 0}
                </dd>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <dt className="text-xs text-zinc-500">Comunidad</dt>
                <dd className="mt-1 text-sm text-white">
                  {editingProduct.community_only ? "Solo comunidad" : "Público"}
                </dd>
              </div>
            </dl>
            {pricePreview.length > 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
                <h3 className="text-sm font-medium text-white">Precio efectivo</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Si no hay override, se usa la prioridad configurada en el servidor.
                </p>
                <ul className="mt-3 space-y-1 text-sm">
                  {pricePreview.map((row) => (
                    <li
                      key={row.label}
                      className="flex justify-between gap-4 text-zinc-300"
                    >
                      <span>{row.label}</span>
                      <span className="font-medium text-white">
                        {formatStorePrice(row.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "images" ? (
          <div className="space-y-4">
            <AdminStoreProductImageFields
              key={`${productId ?? "new"}-images`}
              productId={productId}
              mainImageUrl={mainImageUrl}
              galleryUrls={galleryUrls}
              onMainImageChange={setMainImageUrl}
              onGalleryChange={setGalleryUrls}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={pending || !productId}
                onClick={handleSaveImages}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {pending ? "Guardando..." : "Guardar imágenes"}
              </button>
              {!productId ? (
                <p className="text-xs text-zinc-500">
                  Creá el producto en General para habilitar el guardado de imágenes.
                </p>
              ) : null}
              {error && tab === "images" ? (
                <p className="text-sm text-red-400">{error}</p>
              ) : null}
              {success && tab === "images" ? (
                <p className="text-sm text-emerald-400">{success}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "general" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <AdminStoreField label="Nombre" htmlFor="name">
                <input
                  id="name"
                  name="name"
                  required
                  defaultValue={editingProduct?.name ?? ""}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
              <AdminStoreField label="Slug" htmlFor="slug">
                <input
                  id="slug"
                  name="slug"
                  defaultValue={editingProduct?.slug ?? ""}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStoreField label="SKU" htmlFor="sku">
                <input
                  id="sku"
                  name="sku"
                  defaultValue={editingProduct?.sku ?? ""}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
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
            </div>

            {(editingProduct?.variants.length ?? 0) === 0 ? (
              <AdminStoreField label="Stock total (sin variantes)" htmlFor="stock_total">
                <input
                  id="stock_total"
                  name="stock_total"
                  type="number"
                  min={0}
                  defaultValue={editingProduct?.stock_total ?? 0}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
                Este producto usa stock por variante. Administrá el stock en la pestaña
                Variantes.
              </p>
            )}

            <AdminStoreField label="Descripción corta" htmlFor="short_description">
              <input
                id="short_description"
                name="short_description"
                defaultValue={editingProduct?.short_description ?? ""}
                className={adminStoreFieldClass}
              />
            </AdminStoreField>

            <AdminStoreField label="Descripción" htmlFor="description">
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={editingProduct?.description ?? ""}
                className={cn(adminStoreFieldClass, "resize-y")}
              />
            </AdminStoreField>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminStoreField label="Disponible desde" htmlFor="available_from">
                <input
                  id="available_from"
                  name="available_from"
                  type="datetime-local"
                  defaultValue={
                    editingProduct?.available_from
                      ? editingProduct.available_from.slice(0, 16)
                      : ""
                  }
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
              <AdminStoreField label="Disponible hasta" htmlFor="available_until">
                <input
                  id="available_until"
                  name="available_until"
                  type="datetime-local"
                  defaultValue={
                    editingProduct?.available_until
                      ? editingProduct.available_until.slice(0, 16)
                      : ""
                  }
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
            </div>

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
                  name="show_in_store"
                  defaultChecked={editingProduct?.show_in_store ?? true}
                  className="rounded border-zinc-600"
                />
                Mostrar en tienda
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

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                {pending ? "Guardando..." : productId ? "Guardar cambios" : "Crear producto"}
              </button>
              {error ? <p className="text-sm text-red-400">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-400">{success}</p> : null}
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}
