"use client";

import Link from "next/link";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { PageContainer, PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

export function StoreCartPageClient() {
  const { items, itemCount, updateQuantity, removeItem, clearCart } = useStoreCart();

  return (
    <PageContainer>
      <h1 className="public-heading text-3xl font-black">Carrito</h1>
      <p className="mt-2 text-sm public-text-muted">
        {itemCount} {itemCount === 1 ? "producto" : "productos"}
      </p>

      {items.length === 0 ? (
        <PublicCard padding="lg" className="mt-8 text-center">
          <p className="public-text-muted">Tu carrito está vacío.</p>
          <PublicButton href={ROUTES.tienda} variant="primary" className="mt-4">
            Ir a la tienda
          </PublicButton>
        </PublicCard>
      ) : (
        <>
          <div className="mt-8 space-y-4">
            {items.map((item) => (
              <PublicCard key={`${item.productId}-${item.variantId}`} padding="md">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">Producto</p>
                    <p className="text-xs public-text-muted">
                      ID {item.productId.slice(0, 8)}
                      {item.variantId ? ` · Variante ${item.variantId.slice(0, 8)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg border px-2 py-1 text-sm"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity - 1,
                        )
                      }
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      className="rounded-lg border px-2 py-1 text-sm"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity + 1,
                        )
                      }
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="text-sm text-red-600"
                      onClick={() => removeItem(item.productId, item.variantId)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              </PublicCard>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <PublicButton href={ROUTES.tiendaCheckout} variant="primary">
              Continuar al checkout
            </PublicButton>
            <PublicButton type="button" variant="ghost" onClick={clearCart}>
              Vaciar carrito
            </PublicButton>
            <Link href={ROUTES.tienda} className="text-sm public-text-muted underline">
              Seguir comprando
            </Link>
          </div>
        </>
      )}
    </PageContainer>
  );
}
