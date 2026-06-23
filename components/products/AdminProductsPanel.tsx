"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PRODUCT_UNITS, STOCK_ADJUSTMENT_TYPES, STOCK_MOVEMENT_LABELS } from "@/lib/products/constants";
import {
  adjustProductStockAction,
  createProductAction,
  deleteProductAction,
  deleteProductCategoryAction,
  fetchProductStockMovementsAction,
  toggleProductActiveAction,
  updateProductAction,
  upsertProductCategoryAction,
} from "@/lib/products/actions";
import type {
  GlobalProduct,
  ProductCategory,
  ProductDashboardStats,
  ProductFormInput,
  ProductStockMovement,
} from "@/lib/products/types";
import {
  adminInputClassName,
  adminSelectClassName,
} from "@/lib/utils/adminFormStyles";
import { cn } from "@/lib/utils/cn";

type AdminProductsPanelProps = {
  products: GlobalProduct[];
  categories: ProductCategory[];
  stats: ProductDashboardStats;
  initialHideInactive: boolean;
};

export function AdminProductsPanel({
  products,
  categories,
  stats,
  initialHideInactive,
}: AdminProductsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [skuQuery, setSkuQuery] = useState(searchParams.get("sku") ?? "");
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") ?? "",
  );
  const [hideInactive, setHideInactive] = useState(initialHideInactive);
  const [lowStockOnly, setLowStockOnly] = useState(
    searchParams.get("lowStock") === "1",
  );
  const [usedInEventsOnly, setUsedInEventsOnly] = useState(
    searchParams.get("used") === "1",
  );

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [movementsModalOpen, setMovementsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<GlobalProduct | null>(
    null,
  );
  const [stockProduct, setStockProduct] = useState<GlobalProduct | null>(null);
  const [movementsProduct, setMovementsProduct] = useState<GlobalProduct | null>(
    null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active),
    [categories],
  );

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (hideInactive) {
      list = list.filter((product) => product.is_active);
    }

    if (categoryFilter) {
      list = list.filter((product) => product.category_id === categoryFilter);
    }

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((product) => product.name.toLowerCase().includes(q));
    }

    const sku = skuQuery.trim().toLowerCase();
    if (sku) {
      list = list.filter((product) =>
        (product.sku ?? "").toLowerCase().includes(sku),
      );
    }

    if (lowStockOnly) {
      list = list.filter((product) => product.is_low_stock);
    }

    if (usedInEventsOnly) {
      list = list.filter((product) => product.events_used_count > 0);
    }

    return list;
  }, [
    products,
    hideInactive,
    categoryFilter,
    query,
    skuQuery,
    lowStockOnly,
    usedInEventsOnly,
  ]);

  function syncUrl(next: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.replace(`/admin/productos?${params.toString()}`);
  }

  function openCreateProduct() {
    setEditingProduct(null);
    setFormError(null);
    setProductModalOpen(true);
  }

  function openEditProduct(product: GlobalProduct) {
    setEditingProduct(product);
    setFormError(null);
    setProductModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Activos" value={String(stats.activeCount)} />
        <StatCard label="Inactivos" value={String(stats.inactiveCount)} />
        <StatCard label="Unidades disponibles" value={String(stats.availableUnits)} />
        <StatCard label="Stock bajo" value={String(stats.lowStockCount)} tone="warning" />
        <StatCard label="Categorías" value={String(stats.categoryCount)} />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className={adminInputClassName}
            placeholder="Buscar por nombre"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              syncUrl({ q: event.target.value || null });
            }}
          />
          <input
            className={adminInputClassName}
            placeholder="Código / SKU"
            value={skuQuery}
            onChange={(event) => {
              setSkuQuery(event.target.value);
              syncUrl({ sku: event.target.value || null });
            }}
          />
          <select
            className={adminSelectClassName}
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              syncUrl({ category: event.target.value || null });
            }}
          >
            <option value="">Todas las categorías</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.is_active ? " (inactiva)" : ""}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-3 text-sm text-zinc-300">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hideInactive}
                onChange={(event) => {
                  setHideInactive(event.target.checked);
                  syncUrl({ hideInactive: event.target.checked ? null : "0" });
                }}
              />
              Ocultar productos inactivos
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(event) => {
                  setLowStockOnly(event.target.checked);
                  syncUrl({ lowStock: event.target.checked ? "1" : null });
                }}
              />
              Stock bajo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={usedInEventsOnly}
                onChange={(event) => {
                  setUsedInEventsOnly(event.target.checked);
                  syncUrl({ used: event.target.checked ? "1" : null });
                }}
              />
              Usados en eventos
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setCategoryModalOpen(true)} variant="outline">
            Categorías
          </Button>
          <Button type="button" onClick={openCreateProduct}>
            + Nuevo producto
          </Button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-bold text-white">
            {products.length === 0
              ? "Sin productos todavía"
              : "Sin resultados para estos filtros"}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {products.length === 0
              ? "Creá el primer producto del catálogo global."
              : "Probá cambiar la búsqueda o desmarcar filtros."}
          </p>
        </Card>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-white/10 lg:block">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Físico</th>
                  <th className="px-4 py-3">Reservado</th>
                  <th className="px-4 py-3">Disponible</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Eventos</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <ProductTableRow
                    key={product.id}
                    product={product}
                    isPending={isPending}
                    onEdit={() => openEditProduct(product)}
                    onAdjustStock={() => {
                      setStockProduct(product);
                      setStockModalOpen(true);
                    }}
                    onViewMovements={() => {
                      setMovementsProduct(product);
                      setMovementsModalOpen(true);
                    }}
                    onToggleActive={() => {
                      startTransition(async () => {
                        await toggleProductActiveAction(
                          product.id,
                          !product.is_active,
                        );
                        router.refresh();
                      });
                    }}
                    onDelete={() => {
                      if (
                        !confirm(
                          "¿Eliminar este producto? Solo está permitido si nunca fue utilizado.",
                        )
                      ) {
                        return;
                      }
                      startTransition(async () => {
                        const result = await deleteProductAction(product.id);
                        if (!result.success) {
                          alert(result.error);
                          return;
                        }
                        router.refresh();
                      });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filteredProducts.map((product) => (
              <ProductMobileCard
                key={product.id}
                product={product}
                onEdit={() => openEditProduct(product)}
                onAdjustStock={() => {
                  setStockProduct(product);
                  setStockModalOpen(true);
                }}
                onViewMovements={() => {
                  setMovementsProduct(product);
                  setMovementsModalOpen(true);
                }}
              />
            ))}
          </div>
        </>
      )}

      <ProductFormModal
        key={editingProduct?.id ?? "new"}
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        product={editingProduct}
        categories={activeCategories}
        error={formError}
        onSubmit={(input) => {
          startTransition(async () => {
            const result = editingProduct
              ? await updateProductAction(editingProduct.id, input)
              : await createProductAction(input);

            if (!result.success) {
              setFormError(result.error);
              return;
            }

            setProductModalOpen(false);
            router.refresh();
          });
        }}
      />

      <CategoryManageModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        categories={categories}
        onChanged={() => router.refresh()}
      />

      <StockAdjustModal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        product={stockProduct}
        onSubmit={(input) => {
          if (!stockProduct) {
            return;
          }
          startTransition(async () => {
            const result = await adjustProductStockAction(stockProduct.id, input);
            if (!result.success) {
              alert(result.error);
              return;
            }
            setStockModalOpen(false);
            router.refresh();
          });
        }}
      />

      <ProductStockMovementsModal
        open={movementsModalOpen}
        onClose={() => {
          setMovementsModalOpen(false);
          setMovementsProduct(null);
        }}
        product={movementsProduct}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card padding="md" className={tone === "warning" ? "border-amber-500/30" : ""}>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </Card>
  );
}

function ProductTableRow({
  product,
  isPending,
  onEdit,
  onAdjustStock,
  onViewMovements,
  onToggleActive,
  onDelete,
}: {
  product: GlobalProduct;
  isPending: boolean;
  onEdit: () => void;
  onAdjustStock: () => void;
  onViewMovements: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-t border-white/10 text-zinc-200">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <ProductThumb imageUrl={product.image_url} name={product.name} />
          <div>
            <p className="font-medium text-white">{product.name}</p>
            <p className="text-xs text-zinc-500">{product.unit}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">{product.category_name ?? "—"}</td>
      <td className="px-4 py-3">{product.sku ?? "—"}</td>
      <td className="px-4 py-3">{product.stock_on_hand}</td>
      <td className="px-4 py-3">{product.stock_reserved}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            product.is_low_stock && "text-amber-300",
            product.stock_available === 0 && "text-red-300",
          )}
        >
          {product.stock_available}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge active={product.is_active} lowStock={product.is_low_stock} />
      </td>
      <td className="px-4 py-3">{product.events_used_count}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          <MiniButton onClick={onEdit} disabled={isPending}>
            Editar
          </MiniButton>
          <MiniButton onClick={onAdjustStock} disabled={isPending}>
            Stock
          </MiniButton>
          <MiniButton onClick={onViewMovements} disabled={isPending}>
            Historial
          </MiniButton>
          <MiniButton onClick={onToggleActive} disabled={isPending}>
            {product.is_active ? "Desactivar" : "Activar"}
          </MiniButton>
          <MiniButton onClick={onDelete} disabled={isPending}>
            Eliminar
          </MiniButton>
        </div>
      </td>
    </tr>
  );
}

function ProductMobileCard({
  product,
  onEdit,
  onAdjustStock,
  onViewMovements,
}: {
  product: GlobalProduct;
  onEdit: () => void;
  onAdjustStock: () => void;
  onViewMovements: () => void;
}) {
  return (
    <Card className="flex gap-3 p-4">
      <ProductThumb imageUrl={product.image_url} name={product.name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-white">{product.name}</h3>
            <p className="text-xs text-zinc-400">{product.category_name}</p>
          </div>
          <StatusBadge active={product.is_active} lowStock={product.is_low_stock} />
        </div>
        <p className="mt-2 text-sm text-zinc-300">
          Disponible: {product.stock_available} · Reservado: {product.stock_reserved}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <MiniButton onClick={onEdit}>Editar</MiniButton>
          <MiniButton onClick={onAdjustStock}>Ajustar stock</MiniButton>
          <MiniButton onClick={onViewMovements}>Historial</MiniButton>
        </div>
      </div>
    </Card>
  );
}

function ProductThumb({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
      {imageUrl ? (
        <Image src={imageUrl} alt={name} fill className="object-cover" sizes="40px" />
      ) : (
        <div className="flex h-full items-center justify-center text-[10px] text-zinc-500">
          Sin foto
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  active,
  lowStock,
}: {
  active: boolean;
  lowStock: boolean;
}) {
  if (!active) {
    return (
      <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-300">
        Inactivo
      </span>
    );
  }

  if (lowStock) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">
        Stock bajo
      </span>
    );
  }

  return (
    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200">
      Activo
    </span>
  );
}

function MiniButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function ProductFormModal({
  open,
  onClose,
  product,
  categories,
  error,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  product: GlobalProduct | null;
  categories: ProductCategory[];
  error: string | null;
  onSubmit: (input: ProductFormInput) => void;
}) {
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "unidad");
  const [initialStock, setInitialStock] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product?.low_stock_threshold?.toString() ?? "",
  );
  const [isActive, setIsActive] = useState(product?.is_active ?? true);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? "Editar producto" : "Nuevo producto"}
      className="max-w-xl"
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            name,
            category_id: categoryId,
            description: description || null,
            image_url: imageUrl || null,
            sku: sku || null,
            unit,
            initial_stock: product ? undefined : Number(initialStock) || 0,
            low_stock_threshold: lowStockThreshold
              ? Number(lowStockThreshold)
              : null,
            is_active: isActive,
          });
        }}
      >
        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <Field label="Nombre *">
          <input
            className={adminInputClassName}
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>

        <Field label="Categoría *">
          <select
            className={adminSelectClassName}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
          >
            <option value="">Seleccionar</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Descripción">
          <textarea
            className={adminInputClassName}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Imagen (URL)">
            <input
              className={adminInputClassName}
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
            />
          </Field>
          <Field label="Código / SKU">
            <input
              className={adminInputClassName}
              value={sku}
              onChange={(event) => setSku(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unidad de control *">
            <select
              className={adminSelectClassName}
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              required
            >
              {PRODUCT_UNITS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
          {!product ? (
            <Field label="Stock inicial">
              <input
                type="number"
                min={0}
                className={adminInputClassName}
                value={initialStock}
                onChange={(event) => setInitialStock(event.target.value)}
              />
            </Field>
          ) : (
            <Field label="Alerta stock bajo">
              <input
                type="number"
                min={0}
                className={adminInputClassName}
                value={lowStockThreshold}
                onChange={(event) => setLowStockThreshold(event.target.value)}
              />
            </Field>
          )}
        </div>

        {!product ? (
          <Field label="Alerta stock bajo">
            <input
              type="number"
              min={0}
              className={adminInputClassName}
              value={lowStockThreshold}
              onChange={(event) => setLowStockThreshold(event.target.value)}
            />
          </Field>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Producto activo
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryManageModal({
  open,
  onClose,
  categories,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  categories: ProductCategory[];
  onChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Categorías" className="max-w-lg">
      <form
        className="mb-6 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await upsertProductCategoryAction({ name });
          if (!result.success) {
            setError(result.error);
            return;
          }
          setName("");
          setError(null);
          onChanged();
        }}
      >
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <Field label="Nueva categoría">
          <div className="flex gap-2">
            <input
              className={adminInputClassName}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Button type="submit" size="sm">
              Agregar
            </Button>
          </div>
        </Field>
      </form>

      <ul className="space-y-2">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2"
          >
            <div>
              <p className="font-medium text-white">{category.name}</p>
              <p className="text-xs text-zinc-500">
                Orden {category.sort_order}
                {!category.is_active ? " · inactiva" : ""}
              </p>
            </div>
            <div className="flex gap-1">
              <MiniButton
                onClick={async () => {
                  await upsertProductCategoryAction({
                    id: category.id,
                    name: category.name,
                    sort_order: category.sort_order,
                    is_active: !category.is_active,
                  });
                  onChanged();
                }}
              >
                {category.is_active ? "Desactivar" : "Activar"}
              </MiniButton>
              <MiniButton
                onClick={async () => {
                  const result = await deleteProductCategoryAction(category.id);
                  if (!result.success) {
                    alert(result.error);
                    return;
                  }
                  onChanged();
                }}
              >
                Eliminar
              </MiniButton>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function StockAdjustModal({
  open,
  onClose,
  product,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  product: GlobalProduct | null;
  onSubmit: (input: {
    movement_type: string;
    quantity: number;
    reason: string;
  }) => void;
}) {
  const [movementType, setMovementType] = useState("restock");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");

  if (!product) {
    return null;
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Ajustar stock · ${product.name}`}
      className="max-w-md"
    >
      <p className="mb-4 text-sm text-zinc-400">
        Físico: {product.stock_on_hand} · Reservado: {product.stock_reserved} ·
        Disponible: {product.stock_available}
      </p>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            movement_type: movementType,
            quantity: Number(quantity) || 0,
            reason,
          });
        }}
      >
        <Field label="Tipo de movimiento *">
          <select
            className={adminSelectClassName}
            value={movementType}
            onChange={(event) => setMovementType(event.target.value)}
          >
            {STOCK_ADJUSTMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cantidad *">
          <input
            type="number"
            min={1}
            className={adminInputClassName}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </Field>
        <Field label="Motivo *">
          <textarea
            className={adminInputClassName}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit">Confirmar ajuste</Button>
        </div>
      </form>
    </Modal>
  );
}

function ProductStockMovementsModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: GlobalProduct | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<ProductStockMovement[]>([]);

  useEffect(() => {
    if (!open || !product) {
      return;
    }

    let cancelled = false;

    async function loadMovements() {
      setLoading(true);
      setError(null);

      const result = await fetchProductStockMovementsAction(product!.id);

      if (cancelled) {
        return;
      }

      setLoading(false);

      if (!result.success) {
        setError(result.error);
        setMovements([]);
        return;
      }

      setMovements(result.movements as ProductStockMovement[]);
    }

    void loadMovements();

    return () => {
      cancelled = true;
    };
  }, [open, product]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        product
          ? `Movimientos · ${product.name}`
          : "Movimientos de stock"
      }
    >
      {loading ? (
        <p className="text-sm text-zinc-400">Cargando historial…</p>
      ) : error ? (
        <p className="text-sm text-red-300">{error}</p>
      ) : movements.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Todavía no hay movimientos registrados para este producto.
        </p>
      ) : (
        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
          {movements.map((movement) => (
            <div
              key={movement.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-white">
                  {STOCK_MOVEMENT_LABELS[movement.movement_type] ??
                    movement.movement_type}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    movement.quantity_delta > 0
                      ? "text-emerald-300"
                      : movement.quantity_delta < 0
                        ? "text-amber-200"
                        : "text-zinc-300",
                  )}
                >
                  {movement.quantity_delta > 0 ? "+" : ""}
                  {movement.quantity_delta}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Stock: {movement.previous_stock_on_hand} →{" "}
                {movement.resulting_stock_on_hand}
                {movement.previous_stock_reserved != null &&
                movement.resulting_stock_reserved != null
                  ? ` · Reservado: ${movement.previous_stock_reserved} → ${movement.resulting_stock_reserved}`
                  : ""}
              </p>
              {movement.reason ? (
                <p className="mt-1 text-xs text-zinc-400">{movement.reason}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-zinc-600">
                {new Date(movement.created_at).toLocaleString("es-AR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      {children}
    </label>
  );
}
