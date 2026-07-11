"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { useCartLineDetails } from "@/components/store/hooks/useCartLineDetails";
import { StoreProductImageFallback } from "@/components/store/StoreProductImageFallback";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { formatStorePrice } from "@/lib/store/utils";

export function StoreCartPageClient() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { items, itemCount, updateQuantity, removeItem, clearCart } =
    useStoreCart();
  const { lines, loading, error } = useCartLineDetails(mounted ? items : []);

  const lineMap = useMemo(
    () => new Map(lines.map((line) => [`${line.productId}:${line.variantId ?? "base"}`, line])),
    [lines],
  );

  const subtotal = lines.reduce((sum, line) => {
    const item = items.find(
      (i) =>
        i.productId === line.productId &&
        (i.variantId ?? null) === (line.variantId ?? null),
    );
    return sum + line.unitPrice * (item?.quantity ?? 0);
  }, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
        Tu selección
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Carrito</h1>
      {!mounted ? (
        <div className="mt-10 space-y-4" aria-busy="true" aria-label="Cargando carrito">
          <div className="store-skeleton h-32 rounded-xl" />
          <div className="store-skeleton h-40 rounded-xl" />
        </div>
      ) : (
        <>
      <p className="mt-2 text-sm text-[var(--public-text-secondary)]">
        {itemCount} {itemCount === 1 ? "producto" : "productos"}
      </p>

      {items.length === 0 ? (
        <div className="store-surface mt-10 rounded-2xl px-6 py-16 text-center">
          <p className="text-lg text-[var(--public-text-secondary)]">
            Tu carrito todavía está esperando su primera elección.
          </p>
          <PublicButton href={ROUTES.tienda} variant="primary" className="mt-6" size="lg">
            Descubrir productos
          </PublicButton>
        </div>
      ) : (
        <>
          {error ? (
            <div
              className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              No pudimos cargar los detalles del carrito. Revisá tu conexión e
              intentá de nuevo.
            </div>
          ) : null}
          <div className="mt-8 space-y-4">
            {items.map((item) => {
              const key = `${item.productId}:${item.variantId ?? "base"}`;
              const line = lineMap.get(key);
              const lineTotal = (line?.unitPrice ?? 0) * item.quantity;

              return (
                <article
                  key={key}
                  className="store-surface flex gap-4 rounded-xl p-4 sm:p-5"
                >
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--public-border)] sm:h-28 sm:w-24">
                    {line?.imageUrl ? (
                      <Image
                        src={line.imageUrl}
                        alt={line.productName}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : loading ? (
                      <div className="store-skeleton h-full w-full" />
                    ) : (
                      <StoreProductImageFallback
                        name={line?.productName ?? "Producto"}
                        compact
                      />
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        {line?.slug ? (
                          <Link
                            href={ROUTES.tiendaProducto(line.slug)}
                            className="font-semibold hover:text-[var(--public-primary-hover)]"
                          >
                            {line?.productName ?? "Cargando..."}
                          </Link>
                        ) : (
                          <p className="font-semibold">
                            {line?.productName ?? "Cargando..."}
                          </p>
                        )}
                        {line?.variantName ? (
                          <p className="mt-0.5 text-xs text-[var(--public-text-secondary)]">
                            {line.variantName}
                          </p>
                        ) : null}
                        {line && !line.available ? (
                          <p className="mt-1 text-xs text-amber-300" role="status">
                            Este producto ya no está disponible. Podés eliminarlo del
                            carrito.
                          </p>
                        ) : null}
                      </div>
                      <p className="shrink-0 font-semibold">
                        {line ? formatStorePrice(lineTotal) : "—"}
                      </p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                      <div className="flex items-center gap-1 rounded-lg border border-[var(--public-border)]">
                        <button
                          type="button"
                          className="px-3 py-2 text-sm transition hover:bg-[var(--public-header-hover)]"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              item.quantity - 1,
                            )
                          }
                          aria-label="Disminuir cantidad"
                        >
                          −
                        </button>
                        <span className="min-w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="px-3 py-2 text-sm transition hover:bg-[var(--public-header-hover)]"
                          onClick={() =>
                            updateQuantity(
                              item.productId,
                              item.variantId,
                              item.quantity + 1,
                            )
                          }
                          aria-label="Aumentar cantidad"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="text-sm text-[var(--public-text-secondary)] transition hover:text-red-400"
                        onClick={() => removeItem(item.productId, item.variantId)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="store-surface mt-8 rounded-2xl p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--public-text-secondary)]">Subtotal</span>
              <span className="font-medium">
                {lines.length > 0 ? formatStorePrice(subtotal) : "—"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-[var(--public-border)] pt-4">
              <span className="font-semibold">Total estimado</span>
              <span className="text-xl font-bold">
                {lines.length > 0 ? formatStorePrice(subtotal) : "—"}
              </span>
            </div>
            <p className="mt-3 text-xs text-[var(--public-text-soft)]">
              El total final se confirma al reservar el pedido. La reserva dura 30
              minutos.
            </p>
            <PublicButton
              href={ROUTES.tiendaCheckout}
              variant="primary"
              size="lg"
              className="mt-6 w-full"
            >
              Continuar al checkout
            </PublicButton>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={ROUTES.tienda}
                className="text-sm text-[var(--public-text-secondary)] underline-offset-2 hover:underline"
              >
                Seguir comprando
              </Link>
              <button
                type="button"
                className="text-sm text-[var(--public-text-soft)] hover:text-[var(--public-text-secondary)]"
                onClick={clearCart}
              >
                Vaciar carrito
              </button>
            </div>
          </div>
        </>
      )}
        </>
      )}
    </div>
  );
}
