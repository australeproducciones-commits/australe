"use client";

import {
  adminStoreFieldClass,
  AdminStoreField,
} from "@/components/store/admin/adminStoreUi";
import type { StoreProductVariant } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

type AdminStoreProductDuplicateVariantsPanelProps = {
  variants: StoreProductVariant[];
  onChange: (variants: StoreProductVariant[]) => void;
};

export function AdminStoreProductDuplicateVariantsPanel({
  variants,
  onChange,
}: AdminStoreProductDuplicateVariantsPanelProps) {
  if (variants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
        El producto original no tiene variantes. Podés agregarlas después de crear la copia.
      </p>
    );
  }

  function updateVariant(index: number, patch: Partial<StoreProductVariant>) {
    onChange(
      variants.map((variant, currentIndex) =>
        currentIndex === index ? { ...variant, ...patch } : variant,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Estas variantes se crearán como registros nuevos al guardar. Los SKU se generan vacíos
        para evitar conflictos.
      </p>
      <div className="space-y-3">
        {variants.map((variant, index) => (
          <article
            key={variant.id || `${variant.name}-${index}`}
            className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4"
          >
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <AdminStoreField label="Nombre">
                <input
                  className={adminStoreFieldClass}
                  value={variant.name}
                  onChange={(event) => updateVariant(index, { name: event.target.value })}
                />
              </AdminStoreField>
              <AdminStoreField label="Talle">
                <input
                  className={adminStoreFieldClass}
                  value={variant.size ?? ""}
                  onChange={(event) =>
                    updateVariant(index, { size: event.target.value || null })
                  }
                />
              </AdminStoreField>
              <AdminStoreField label="Color">
                <input
                  className={adminStoreFieldClass}
                  value={variant.color ?? ""}
                  onChange={(event) =>
                    updateVariant(index, { color: event.target.value || null })
                  }
                />
              </AdminStoreField>
              <AdminStoreField label="Stock inicial">
                <input
                  type="number"
                  min={0}
                  className={adminStoreFieldClass}
                  value={variant.stock_total}
                  onChange={(event) =>
                    updateVariant(index, {
                      stock_total: Math.max(0, Number(event.target.value) || 0),
                    })
                  }
                />
              </AdminStoreField>
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Precio override:{" "}
              {variant.price_override != null
                ? formatStorePrice(variant.price_override)
                : "Usa precio del producto"}
              {variant.community_price_override != null
                ? ` · Comunidad ${formatStorePrice(variant.community_price_override)}`
                : ""}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
