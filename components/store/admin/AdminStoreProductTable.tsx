"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  AdminStoreStatusBadge,
} from "@/components/store/admin/adminStoreUi";
import {
  archiveStoreProductAction,
  toggleStoreProductActiveAction,
} from "@/lib/store/actions";
import type { StoreProduct } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";

type AdminStoreProductTableProps = {
  products: StoreProduct[];
  onEdit: (product: StoreProduct) => void;
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
}: AdminStoreProductTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(product: StoreProduct) {
    startTransition(async () => {
      await toggleStoreProductActiveAction(product.id, !product.is_active);
      router.refresh();
    });
  }

  function handleArchive(product: StoreProduct) {
    if (!window.confirm(`¿Archivar "${product.name}"? No se eliminará del historial de pedidos.`)) {
      return;
    }

    startTransition(async () => {
      await archiveStoreProductAction(product.id);
      router.refresh();
    });
  }

  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-800 px-4 py-10 text-center text-sm text-zinc-500">
        Todavía no hay productos cargados.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-950/80 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2.5">Producto</th>
              <th className="px-3 py-2.5">Categoría</th>
              <th className="px-3 py-2.5">Precio</th>
              <th className="px-3 py-2.5">Stock</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Destacado</th>
              <th className="px-3 py-2.5 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const available = product.stock_total - product.stock_reserved;

              return (
                <tr
                  key={product.id}
                  className="border-t border-zinc-800/80 transition hover:bg-zinc-900/40"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <ProductThumbnail url={product.main_image_url} name={product.name} />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{product.name}</p>
                        <p className="truncate text-xs text-zinc-500">{product.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 capitalize text-zinc-300">{product.category}</td>
                  <td className="px-3 py-2.5 text-zinc-300">
                    {formatStorePrice(product.public_price)}
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300">{available}</td>
                  <td className="px-3 py-2.5">
                    <AdminStoreStatusBadge
                      active={product.is_active}
                      status={product.status}
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    {product.is_featured ? (
                      <span className="text-xs font-medium text-violet-300">Sí</span>
                    ) : (
                      <span className="text-xs text-zinc-500">No</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onEdit(product)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 transition hover:border-violet-500/50 hover:text-white"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={pending || product.status === "archived"}
                        onClick={() => handleToggle(product)}
                        className="rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-zinc-200 transition hover:border-violet-500/50 hover:text-white disabled:opacity-40"
                      >
                        {product.is_active ? "Desactivar" : "Activar"}
                      </button>
                      {product.status !== "archived" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleArchive(product)}
                          className="rounded-md border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500 transition hover:border-red-500/40 hover:text-red-300"
                        >
                          Archivar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
