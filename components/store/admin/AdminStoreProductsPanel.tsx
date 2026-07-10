"use client";

import { useActionState } from "react";
import { upsertStoreProductAction } from "@/lib/store/actions";
import type { StoreProduct } from "@/lib/store/types";
import { STORE_CATEGORIES } from "@/lib/store/utils";

type AdminStoreProductsPanelProps = {
  products: StoreProduct[];
};

type FormState = { error?: string; success?: boolean };

export function AdminStoreProductsPanel({ products }: AdminStoreProductsPanelProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => {
      const result = await upsertStoreProductAction(null, {
        name: String(formData.get("name") ?? ""),
        slug: String(formData.get("slug") ?? ""),
        category: String(formData.get("category") ?? "general"),
        public_price: Number(formData.get("public_price") ?? 0),
        community_price: formData.get("community_price")
          ? Number(formData.get("community_price"))
          : null,
        short_description: String(formData.get("short_description") ?? ""),
        status: "active",
        is_active: formData.get("is_active") === "on",
        is_featured: formData.get("is_featured") === "on",
        community_only: formData.get("community_only") === "on",
        track_stock: true,
        stock_total: Number(formData.get("stock_total") ?? 0),
      });

      return result.success
        ? { success: true }
        : { error: result.error ?? "Error al guardar" };
    },
    {},
  );

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-white">Nuevo producto</h2>
        <form action={formAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <input name="name" placeholder="Nombre" required className="rounded-lg bg-zinc-800 px-3 py-2 text-sm" />
          <input name="slug" placeholder="Slug (opcional)" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm" />
          <select name="category" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm">
            {STORE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input name="public_price" type="number" min={0} placeholder="Precio público" required className="rounded-lg bg-zinc-800 px-3 py-2 text-sm" />
          <input name="community_price" type="number" min={0} placeholder="Precio comunidad" className="rounded-lg bg-zinc-800 px-3 py-2 text-sm" />
          <input name="stock_total" type="number" min={0} placeholder="Stock inicial" defaultValue={0} className="rounded-lg bg-zinc-800 px-3 py-2 text-sm" />
          <input name="short_description" placeholder="Descripción corta" className="md:col-span-2 rounded-lg bg-zinc-800 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="is_active" defaultChecked /> Activo
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="is_featured" /> Destacado
          </label>
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input type="checkbox" name="community_only" /> Solo comunidad
          </label>
          <button type="submit" disabled={pending} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "Guardando..." : "Crear producto"}
          </button>
        </form>
        {state.error ? <p className="mt-3 text-sm text-red-400">{state.error}</p> : null}
        {state.success ? <p className="mt-3 text-sm text-emerald-400">Producto creado.</p> : null}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Catálogo ({products.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-900 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock disp.</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-zinc-800">
                  <td className="px-4 py-3 text-white">{product.name}</td>
                  <td className="px-4 py-3 text-zinc-300">{product.category}</td>
                  <td className="px-4 py-3 text-zinc-300">${product.public_price}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {product.stock_total - product.stock_reserved}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{product.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
