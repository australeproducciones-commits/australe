"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { AdminStoreChannelChips } from "@/components/store/admin/AdminStoreChannelChips";
import { AdminStoreStatusBadge } from "@/components/store/admin/adminStoreUi";
import {
  archiveStoreProductAction,
  toggleStoreProductActiveAction,
} from "@/lib/store/actions";
import type { AdminStoreProductListItem } from "@/lib/store/types";
import { STORE_CATEGORIES, formatStorePrice } from "@/lib/store/utils";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";

type AdminStoreProductTableProps = {
  products: AdminStoreProductListItem[];
  onEdit: (productId: string) => void;
  onDuplicate: (productId: string) => void;
};

function ProductThumbnail({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-[9px] text-zinc-500">
        —
      </div>
    );
  }

  if (isNextImageOptimizable(url)) {
    return (
      <div className="relative h-11 w-11 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
        <Image src={url} alt={name} fill className="object-cover" sizes="44px" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={name}
      className="h-11 w-11 rounded-lg border border-zinc-700 object-cover"
    />
  );
}

export function AdminStoreProductTable({
  products,
  onEdit,
  onDuplicate,
}: AdminStoreProductTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const filtered = useMemo(() => {
    return products.filter((product) => {
      if (q) {
        const query = q.toLowerCase();
        if (
          !product.name.toLowerCase().includes(query) &&
          !product.slug.toLowerCase().includes(query) &&
          !product.sku?.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (category && product.category !== category) return false;
      if (statusFilter === "active" && (!product.is_active || product.status !== "active")) {
        return false;
      }
      if (statusFilter === "inactive" && product.is_active) return false;
      if (statusFilter === "archived" && product.status !== "archived") return false;
      if (channelFilter === "store" && !product.show_in_store) return false;
      if (channelFilter === "events" && product.associations.length === 0) return false;
      if (channelFilter === "community" && !product.community_only) return false;
      if (channelFilter === "soldout" && product.channel.availableStock > 0) return false;
      if (
        channelFilter === "no-channel" &&
        (product.channel.hasActiveStoreChannel || product.channel.hasActiveEventChannel)
      ) {
        return false;
      }
      if (channelFilter === "featured" && !product.is_featured) return false;
      return true;
    });
  }, [products, q, category, statusFilter, channelFilter]);

  function handleToggle(product: AdminStoreProductListItem) {
    startTransition(async () => {
      await toggleStoreProductActiveAction(product.id, !product.is_active);
      router.refresh();
    });
  }

  function handleArchive(product: AdminStoreProductListItem) {
    if (
      !window.confirm(
        `¿Archivar "${product.name}"? No se eliminará del historial de pedidos.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await archiveStoreProductAction(product.id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
          className="min-w-[160px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Categoría</option>
          {STORE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Estado</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
          <option value="archived">Archivados</option>
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Canal</option>
          <option value="store">En tienda</option>
          <option value="events">Con eventos</option>
          <option value="community">Solo comunidad</option>
          <option value="soldout">Agotados</option>
          <option value="no-channel">Sin canal</option>
          <option value="featured">Destacados</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
          No hay productos con esos filtros.
        </p>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-zinc-800 lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-zinc-950/80 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-3 py-2.5">Producto</th>
                    <th className="px-3 py-2.5">Variantes</th>
                    <th className="px-3 py-2.5">Canal</th>
                    <th className="px-3 py-2.5">Eventos</th>
                    <th className="px-3 py-2.5">Precio</th>
                    <th className="px-3 py-2.5">Stock</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => (
                    <tr
                      key={product.id}
                      className="border-t border-zinc-800/80 hover:bg-zinc-900/40"
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <ProductThumbnail
                            url={product.main_image_url}
                            name={product.name}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {product.name}
                            </p>
                            <p className="truncate text-xs text-zinc-500">
                              {product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300">
                        {product.variants.filter((v) => v.is_active).length}/
                        {product.variants.length}
                      </td>
                      <td className="px-3 py-2.5">
                        <AdminStoreChannelChips chips={product.channel.chips} />
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300">
                        {product.associations.filter((a) => a.is_active).length}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300">
                        {formatStorePrice(product.public_price)}
                      </td>
                      <td className="px-3 py-2.5 text-zinc-300">
                        {product.channel.availableStock}
                      </td>
                      <td className="px-3 py-2.5">
                        <AdminStoreStatusBadge
                          active={product.is_active}
                          status={product.status}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onEdit(product.id)}
                            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onDuplicate(product.id)}
                            title="Crear un nuevo producto usando estos datos"
                            className="rounded-md border border-violet-700/60 px-2.5 py-1 text-xs text-violet-200"
                          >
                            Duplicar y editar
                          </button>
                          <button
                            type="button"
                            disabled={pending || product.status === "archived"}
                            onClick={() => handleToggle(product)}
                            className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200"
                          >
                            {product.is_active ? "Desactivar" : "Activar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3 lg:hidden">
            {filtered.map((product) => (
              <article
                key={product.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3"
              >
                <div className="flex gap-3">
                  <ProductThumbnail
                    url={product.main_image_url}
                    name={product.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{product.name}</p>
                    <p className="text-xs text-zinc-500">{product.slug}</p>
                    <div className="mt-2">
                      <AdminStoreChannelChips chips={product.channel.chips} />
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">
                      {formatStorePrice(product.public_price)} · Stock{" "}
                      {product.channel.availableStock} ·{" "}
                      {product.variants.filter((v) => v.is_active).length} var.
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(product.id)}
                    className="flex-1 rounded border border-zinc-700 py-2 text-xs text-zinc-200"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDuplicate(product.id)}
                    title="Crear un nuevo producto usando estos datos"
                    className="flex-1 rounded border border-violet-700/60 py-2 text-xs text-violet-200"
                  >
                    Duplicar y editar
                  </button>
                  {product.status !== "archived" ? (
                    <button
                      type="button"
                      onClick={() => handleArchive(product)}
                      className="rounded border border-zinc-800 px-3 py-2 text-xs text-zinc-500"
                    >
                      Archivar
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
