"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AdminStoreChannelChips } from "@/components/store/admin/AdminStoreChannelChips";
import {
  linkStoreProductToEventAction,
  updateEventStoreProductAction,
} from "@/lib/store/actions";
import type { AdminStoreProductListItem } from "@/lib/store/types";
import type { EventStoreSettings } from "@/lib/store/types";
import { ROUTES } from "@/lib/constants/routes";
import { formatStorePrice } from "@/lib/store/utils";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";

type MerchItem = {
  id: string;
  event_id: string;
  product_id: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  event_price_override: number | null;
  pickup_available: boolean;
  starts_at: string | null;
  ends_at: string | null;
  product: AdminStoreProductListItem;
  channel: AdminStoreProductListItem["channel"];
};

type AdminEventStoreMerchPanelProps = {
  eventId: string;
  eventName: string;
  settings: EventStoreSettings | null;
  items: MerchItem[];
  linkableProducts: AdminStoreProductListItem[];
};

export function AdminEventStoreMerchPanel({
  eventId,
  eventName,
  settings,
  items,
  linkableProducts,
}: AdminEventStoreMerchPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productToLink, setProductToLink] = useState("");

  function handleLink() {
    if (!productToLink) return;
    startTransition(async () => {
      await linkStoreProductToEventAction(eventId, productToLink, { is_active: true });
      setProductToLink("");
      router.refresh();
    });
  }

  function handleToggle(associationId: string, isActive: boolean) {
    startTransition(async () => {
      await updateEventStoreProductAction(associationId, { is_active: !isActive });
      router.refresh();
    });
  }

  return (
    <section className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-white">Merchandising · {eventName}</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Vista rápida de productos asociados. La edición completa está en Tienda.
          </p>
          {settings ? (
            <p className="mt-2 text-xs text-zinc-500">
              Badge: {settings.show_badge ? settings.badge_text : "oculto"} · Merch{" "}
              {settings.merchandising_enabled ? "habilitado" : "deshabilitado"}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-300">
              Sin configuración de merchandising para este evento.
            </p>
          )}
        </div>
        <Link
          href={ROUTES.adminTiendaProductos}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500"
        >
          Administrar en Tienda
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={productToLink}
          onChange={(e) => setProductToLink(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Asociar producto existente...</option>
          {linkableProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !productToLink}
          onClick={handleLink}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-200 disabled:opacity-50"
        >
          Asociar
        </button>
      </div>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No hay productos asociados a este evento.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
                {item.product.main_image_url && isNextImageOptimizable(item.product.main_image_url) ? (
                  <Image
                    src={item.product.main_image_url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] text-zinc-500">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {item.product.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {formatStorePrice(item.event_price_override ?? item.product.public_price)} ·
                  Stock {item.channel.availableStock} ·{" "}
                  {item.pickup_available ? "Retiro sí" : "Retiro no"}
                </p>
                <AdminStoreChannelChips chips={item.channel.chips} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => handleToggle(item.id, item.is_active)}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-200"
                >
                  {item.is_active ? "Desactivar" : "Activar"}
                </button>
                <Link
                  href={ROUTES.adminTiendaProductos}
                  className="rounded border border-zinc-700 px-2 py-1 text-xs text-violet-200"
                >
                  Editar producto
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
