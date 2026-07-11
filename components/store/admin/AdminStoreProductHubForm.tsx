"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  AdminStoreChannelChips,
  AdminStoreWarnings,
} from "@/components/store/admin/AdminStoreChannelChips";
import { AdminStoreProductDuplicateVariantsPanel } from "@/components/store/admin/AdminStoreProductDuplicateVariantsPanel";
import {
  adminStoreFieldClass,
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import { AdminStoreProductEventsSection } from "@/components/store/admin/AdminStoreProductEventsSection";
import { AdminStoreProductImageFields } from "@/components/store/admin/AdminStoreProductImageFields";
import { AdminStoreProductVariantsSection } from "@/components/store/admin/AdminStoreProductVariantsSection";
import { ROUTES } from "@/lib/constants/routes";
import { buildStorePricePreview } from "@/lib/store/adminHub";
import {
  createStoreProductWithVariantsAction,
  upsertStoreProductAction,
} from "@/lib/store/actions";
import { variantDraftToInput } from "@/lib/store/duplicate";
import type {
  AdminStoreProductListItem,
  AdminStoreProductsPageData,
  StoreProductDuplicateContext,
  StoreProductVariant,
} from "@/lib/store/types";
import { STORE_CATEGORIES, formatStorePrice } from "@/lib/store/utils";
import { cn } from "@/lib/utils/cn";

type HubTab = "general" | "images" | "variants" | "channels" | "events";

type AdminStoreProductHubFormProps = {
  editingProduct: AdminStoreProductListItem | null;
  duplicateContext?: StoreProductDuplicateContext | null;
  pageData: AdminStoreProductsPageData;
  onCancelEdit: () => void;
  onProductCreated?: (productId: string) => void;
};

export function AdminStoreProductHubForm({
  editingProduct,
  duplicateContext = null,
  pageData,
  onCancelEdit,
  onProductCreated,
}: AdminStoreProductHubFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<HubTab>("general");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isDuplicateMode = Boolean(duplicateContext);
  const formProduct = editingProduct ?? duplicateContext?.draft ?? null;

  const [mainImageUrl, setMainImageUrl] = useState<string | null>(
    formProduct?.main_image_url ?? null,
  );
  const [galleryUrls, setGalleryUrls] = useState<string[]>(formProduct?.gallery_urls ?? []);
  const [duplicateVariants, setDuplicateVariants] = useState<StoreProductVariant[]>(
    duplicateContext?.draft.variants ?? [],
  );

  const productId = editingProduct?.id ?? null;
  const channel = editingProduct?.channel;
  const activeVariants = isDuplicateMode
    ? duplicateVariants
    : (editingProduct?.variants ?? []);
  const pricePreview = editingProduct
    ? buildStorePricePreview({ product: editingProduct })
    : formProduct
      ? buildStorePricePreview({ product: formProduct })
      : [];

  const tabs: { id: HubTab; label: string; disabled?: boolean }[] = [
    { id: "general", label: "General" },
    { id: "images", label: "Imágenes" },
    {
      id: "variants",
      label: "Variantes",
      disabled: !productId && !isDuplicateMode,
    },
    { id: "channels", label: "Canales", disabled: !productId },
    { id: "events", label: "Eventos", disabled: !productId },
  ];

  function buildProductInput(formData: FormData) {
    const publicPrice = Number(formData.get("public_price") ?? 0);
    const communityRaw = String(formData.get("community_price") ?? "").trim();
    const communityPrice = communityRaw ? Number(communityRaw) : null;
    const hasVariants = activeVariants.length > 0;
    const stockTotal = hasVariants
      ? formProduct?.stock_total ?? 0
      : Number(formData.get("stock_total") ?? 0);

    return {
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
    } as const;
  }

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

    if (isDuplicateMode) {
      const invalidVariant = duplicateVariants.find((variant) => !variant.name.trim());
      if (invalidVariant) {
        setError("Todas las variantes duplicadas necesitan un nombre.");
        setTab("variants");
        return;
      }
    }

    const input = buildProductInput(formData);

    startTransition(async () => {
      const result = isDuplicateMode
        ? await createStoreProductWithVariantsAction(
            input,
            duplicateVariants.map((variant) => variantDraftToInput(variant)),
          )
        : await upsertStoreProductAction(productId, input);

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar el producto.");
        if (result.id && isDuplicateMode) {
          onProductCreated?.(result.id);
        }
        return;
      }

      setSuccess(
        isDuplicateMode
          ? "Producto duplicado creado correctamente."
          : productId
            ? "Producto actualizado correctamente."
            : "Producto creado correctamente.",
      );

      if (!productId && result.id) {
        onProductCreated?.(result.id);
        setTab(isDuplicateMode ? "variants" : "variants");
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
              {isDuplicateMode
                ? "Nuevo producto (copia)"
                : editingProduct
                  ? "Editar producto"
                  : "Nuevo producto"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Centro de control: datos, variantes, canales y eventos.
            </p>
            {isDuplicateMode && duplicateContext ? (
              <p
                className="mt-3 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-sm text-violet-100"
                role="status"
              >
                Estás creando una copia de “{duplicateContext.sourceProductName}”. El producto
                original no será modificado.
              </p>
            ) : null}
            {channel ? (
              <div className="mt-2 space-y-2">
                <AdminStoreChannelChips chips={channel.chips} />
                <p className="text-xs text-zinc-400">{channel.summary}</p>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {editingProduct ? (
              <Link
                href={ROUTES.adminTiendaProductosDuplicate(editingProduct.id)}
                className="rounded-lg border border-violet-500/40 px-3 py-1.5 text-xs text-violet-200 hover:bg-violet-500/10"
                title="Crear un nuevo producto usando estos datos"
              >
                Duplicar y editar
              </Link>
            ) : null}
            {editingProduct || isDuplicateMode ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                {isDuplicateMode ? "Cancelar copia" : "Cancelar edición"}
              </button>
            ) : null}
          </div>
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

        {tab === "variants" && isDuplicateMode ? (
          <AdminStoreProductDuplicateVariantsPanel
            variants={duplicateVariants}
            onChange={setDuplicateVariants}
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
              Los canales se calculan desde el estado del producto y sus asociaciones. Guardá los
              cambios en la pestaña General.
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
              key={`${productId ?? (isDuplicateMode ? "duplicate" : "new")}-images`}
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
                  {isDuplicateMode
                    ? "Las imágenes se guardarán al crear el producto duplicado."
                    : "Creá el producto en General para habilitar el guardado de imágenes."}
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
                  defaultValue={formProduct?.name ?? ""}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
              <AdminStoreField label="Slug" htmlFor="slug">
                <input
                  id="slug"
                  name="slug"
                  defaultValue={formProduct?.slug ?? ""}
                  placeholder={
                    isDuplicateMode
                      ? "Se generará desde el nombre si queda vacío"
                      : undefined
                  }
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <AdminStoreField label="SKU" htmlFor="sku">
                <input
                  id="sku"
                  name="sku"
                  defaultValue={isDuplicateMode ? "" : (formProduct?.sku ?? "")}
                  placeholder={isDuplicateMode ? "Opcional en la copia" : undefined}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
              <AdminStoreField label="Categoría" htmlFor="category">
                <select
                  id="category"
                  name="category"
                  defaultValue={formProduct?.category ?? "general"}
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
                  defaultValue={formProduct?.public_price ?? ""}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
              <AdminStoreField label="Precio comunidad" htmlFor="community_price">
                <input
                  id="community_price"
                  name="community_price"
                  type="number"
                  min={0}
                  defaultValue={formProduct?.community_price ?? ""}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
            </div>

            {activeVariants.length === 0 ? (
              <AdminStoreField label="Stock total (sin variantes)" htmlFor="stock_total">
                <input
                  id="stock_total"
                  name="stock_total"
                  type="number"
                  min={0}
                  defaultValue={formProduct?.stock_total ?? 0}
                  className={adminStoreFieldClass}
                />
              </AdminStoreField>
            ) : (
              <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-400">
                Este producto usa stock por variante. Revisá el stock en la pestaña Variantes.
              </p>
            )}

            <AdminStoreField label="Descripción corta" htmlFor="short_description">
              <input
                id="short_description"
                name="short_description"
                defaultValue={formProduct?.short_description ?? ""}
                className={adminStoreFieldClass}
              />
            </AdminStoreField>

            <AdminStoreField label="Descripción" htmlFor="description">
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={formProduct?.description ?? ""}
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
                    formProduct?.available_from
                      ? formProduct.available_from.slice(0, 16)
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
                    formProduct?.available_until
                      ? formProduct.available_until.slice(0, 16)
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
                  defaultChecked={formProduct?.is_active ?? true}
                  className="rounded border-zinc-600"
                />
                Activo
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="show_in_store"
                  defaultChecked={formProduct?.show_in_store ?? true}
                  className="rounded border-zinc-600"
                />
                Mostrar en tienda
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="is_featured"
                  defaultChecked={formProduct?.is_featured ?? false}
                  className="rounded border-zinc-600"
                />
                Destacado
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  name="community_only"
                  defaultChecked={formProduct?.community_only ?? false}
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
                {pending
                  ? "Guardando..."
                  : isDuplicateMode
                    ? "Crear producto duplicado"
                    : productId
                      ? "Guardar cambios"
                      : "Crear producto"}
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
