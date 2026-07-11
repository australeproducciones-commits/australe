"use client";

import { useState, useTransition } from "react";
import {
  adminStoreFieldClass,
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import {
  adjustStoreStockAction,
  upsertStoreVariantAction,
} from "@/lib/store/actions";
import type { AdminStoreProductListItem, StoreProductVariant } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

type AdminStoreProductVariantsSectionProps = {
  product: AdminStoreProductListItem;
  onChanged: () => void;
};

const emptyVariant = {
  name: "",
  size: "",
  color: "",
  model: "",
  sku: "",
  price_override: "",
  community_price_override: "",
  stock_total: "0",
  sort_order: "0",
};

export function AdminStoreProductVariantsSection({
  product,
  onChanged,
}: AdminStoreProductVariantsSectionProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");
  const [form, setForm] = useState(emptyVariant);

  function resetForm() {
    setEditingId(null);
    setForm(emptyVariant);
    setError(null);
  }

  function loadVariant(variant: StoreProductVariant) {
    setEditingId(variant.id);
    setForm({
      name: variant.name,
      size: variant.size ?? "",
      color: variant.color ?? "",
      model: variant.model ?? "",
      sku: variant.sku ?? "",
      price_override: variant.price_override?.toString() ?? "",
      community_price_override: variant.community_price_override?.toString() ?? "",
      stock_total: "0",
      sort_order: variant.sort_order.toString(),
    });
  }

  function handleSaveVariant() {
    if (!form.name.trim()) {
      setError("El nombre de la variante es obligatorio.");
      return;
    }

    startTransition(async () => {
      const result = await upsertStoreVariantAction(product.id, editingId, {
        name: form.name.trim(),
        size: form.size.trim() || null,
        color: form.color.trim() || null,
        model: form.model.trim() || null,
        sku: form.sku.trim() || null,
        price_override: form.price_override ? Number(form.price_override) : null,
        community_price_override: form.community_price_override
          ? Number(form.community_price_override)
          : null,
        stock_total: editingId ? 0 : Number(form.stock_total) || 0,
        is_active: true,
        sort_order: Number(form.sort_order) || 0,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo guardar la variante.");
        return;
      }

      resetForm();
      onChanged();
    });
  }

  function handleToggleActive(variant: StoreProductVariant) {
    startTransition(async () => {
      await upsertStoreVariantAction(product.id, variant.id, {
        name: variant.name,
        size: variant.size,
        color: variant.color,
        model: variant.model,
        sku: variant.sku,
        price_override: variant.price_override,
        community_price_override: variant.community_price_override,
        is_active: !variant.is_active,
        sort_order: variant.sort_order,
      });
      onChanged();
    });
  }

  function handleAdjustStock(variant: StoreProductVariant) {
    const qty = Number(adjustQty);
    if (!Number.isFinite(qty) || qty === 0) {
      setError("Ingresá una cantidad distinta de cero.");
      return;
    }
    if (!adjustReason.trim()) {
      setError("El motivo del ajuste es obligatorio.");
      return;
    }

    startTransition(async () => {
      const result = await adjustStoreStockAction(
        product.id,
        variant.id,
        qty,
        adjustReason.trim(),
      );
      if (!result.success) {
        setError(result.error ?? "No se pudo ajustar el stock.");
        return;
      }
      setAdjustingId(null);
      setAdjustQty("1");
      setAdjustReason("");
      onChanged();
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Stock compartido entre tienda y eventos. Los ajustes quedan auditados en movimientos.
      </p>

      <div className="space-y-2">
        {product.variants.map((variant) => {
          const available = variant.stock_total - variant.stock_reserved;
          return (
            <div
              key={variant.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-white">
                    {variant.name}
                    {!variant.is_active ? (
                      <span className="ml-2 text-xs text-amber-300">(inactiva)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {[
                      variant.size && `Talle ${variant.size}`,
                      variant.color,
                      variant.model,
                      variant.sku && `SKU ${variant.sku}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <p>Disponible: {available}</p>
                  <p>
                    Total {variant.stock_total} · Reservado {variant.stock_reserved} ·
                    Vendido {variant.stock_sold}
                  </p>
                  {variant.price_override != null ? (
                    <p>Precio: {formatStorePrice(variant.price_override)}</p>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => loadVariant(variant)}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
                >
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleToggleActive(variant)}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
                >
                  {variant.is_active ? "Desactivar" : "Activar"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setAdjustingId(variant.id);
                    setAdjustReason(
                      `Ajuste manual ${variant.size ? `talle ${variant.size}` : variant.name}`,
                    );
                  }}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
                >
                  Ajustar stock
                </button>
              </div>
              {adjustingId === variant.id ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className={adminStoreFieldClass}
                    placeholder="Cantidad (+/-)"
                  />
                  <input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    className={cnField()}
                    placeholder="Motivo"
                  />
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleAdjustStock(variant)}
                    className="rounded bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Confirmar ajuste
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-zinc-800 p-3">
        <h3 className="text-sm font-semibold text-white">
          {editingId ? "Editar variante" : "Nueva variante"}
        </h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AdminStoreField label="Nombre visible">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          <AdminStoreField label="Talle">
            <input
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          <AdminStoreField label="SKU">
            <input
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          <AdminStoreField label="Precio override">
            <input
              type="number"
              min={0}
              value={form.price_override}
              onChange={(e) => setForm({ ...form, price_override: e.target.value })}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          <AdminStoreField label="Precio comunidad override">
            <input
              type="number"
              min={0}
              value={form.community_price_override}
              onChange={(e) =>
                setForm({ ...form, community_price_override: e.target.value })
              }
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          <AdminStoreField label="Orden">
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              className={adminStoreFieldClass}
            />
          </AdminStoreField>
          {!editingId ? (
            <AdminStoreField label="Stock inicial">
              <input
                type="number"
                min={0}
                value={form.stock_total}
                onChange={(e) => setForm({ ...form, stock_total: e.target.value })}
                className={adminStoreFieldClass}
              />
            </AdminStoreField>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={handleSaveVariant}
            className="rounded bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
          >
            {editingId ? "Actualizar variante" : "Crear variante"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-300"
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

function cnField() {
  return adminStoreFieldClass;
}
