"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { StoreProductGrid } from "@/components/store/StoreProductCard";
import { StoreProductImageFallback } from "@/components/store/StoreProductImageFallback";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import type { PublicStoreProduct } from "@/lib/store/types";
import {
  formatStorePrice,
  getStoreStockAvailable,
  STORE_LOW_STOCK_THRESHOLD,
} from "@/lib/store/utils";
import { cn } from "@/lib/utils/cn";

type StoreProductDetailClientProps = {
  product: PublicStoreProduct;
  relatedProducts: PublicStoreProduct[];
  eventSlug?: string | null;
  isCommunityMember: boolean;
};

export function StoreProductDetailClient({
  product,
  relatedProducts,
  eventSlug,
  isCommunityMember,
}: StoreProductDetailClientProps) {
  const { addItem, setEventContext } = useStoreCart();
  const searchParams = useSearchParams();
  const [variantId, setVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null,
  );
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [activeImage, setActiveImage] = useState(
    product.main_image_url ?? product.gallery_urls[0] ?? null,
  );
  const liveRef = useRef<HTMLDivElement>(null);

  const galleryImages = [
    ...(product.main_image_url ? [product.main_image_url] : []),
    ...product.gallery_urls.filter((url) => url !== product.main_image_url),
  ];

  const selectedVariant =
    product.variants.find((v) => v.id === variantId) ?? null;

  const stock = getStoreStockAvailable(product, selectedVariant);
  const maxQty = product.max_per_order ?? (stock ?? 99);
  const isSoldOut = stock === 0;
  const isLow =
    stock !== null && stock > 0 && stock <= STORE_LOW_STOCK_THRESHOLD;

  useEffect(() => {
    if (message && liveRef.current) {
      liveRef.current.textContent = message;
    }
  }, [message]);

  function handleAddToCart() {
    if (product.variants.length > 0 && !variantId) {
      setMessage("Elegí una variante.");
      return;
    }

    if (stock !== null && quantity > stock) {
      setMessage("No hay stock suficiente.");
      return;
    }

    setAdding(true);

    if (eventSlug) {
      setEventContext(null, eventSlug);
    }

    addItem({
      productId: product.id,
      variantId,
      quantity,
      eventId: searchParams.get("evento"),
    });

    setMessage("Producto agregado al carrito.");
    setAdding(false);
  }

  const backHref = eventSlug ? ROUTES.tiendaEvento(eventSlug) : ROUTES.tienda;

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-14">
        <PublicButton href={backHref} variant="ghost" size="sm" className="mb-8">
          ← Volver a la tienda
        </PublicButton>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <div className="store-surface store-image-zoom relative aspect-square overflow-hidden rounded-2xl">
              {activeImage ? (
                <Image
                  src={activeImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <StoreProductImageFallback name={product.name} />
              )}
            </div>

            {galleryImages.length > 1 ? (
              <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Galería">
                {galleryImages.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActiveImage(url)}
                    className={cn(
                      "relative h-16 w-16 overflow-hidden rounded-lg border transition",
                      activeImage === url
                        ? "border-[rgba(167,139,219,0.6)] ring-2 ring-[rgba(167,139,219,0.2)]"
                        : "border-[var(--public-border)] hover:border-[rgba(167,139,219,0.35)]",
                    )}
                    aria-label="Ver imagen"
                    aria-current={activeImage === url}
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="lg:pt-2">
            <div className="flex flex-wrap gap-2">
              <span className="store-badge">Producto oficial</span>
              {product.community_only ? (
                <span className="store-badge store-badge--community">Comunidad</span>
              ) : null}
              {isLow ? (
                <span className="store-badge store-badge--low">Unidades limitadas</span>
              ) : null}
              {isSoldOut ? (
                <span className="store-badge store-badge--soldout">Agotado</span>
              ) : null}
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
              {product.name}
            </h1>

            {product.short_description ? (
              <p className="mt-3 text-base leading-relaxed text-[var(--public-text-secondary)]">
                {product.short_description}
              </p>
            ) : null}

            <div className="mt-6 border-y border-[var(--public-border)] py-5">
              <p className="text-3xl font-bold">{formatStorePrice(product.display_price)}</p>
              {isCommunityMember && product.display_community_price != null ? (
                <p className="mt-1 text-sm text-[var(--public-community)]">
                  Precio comunidad{" "}
                  {formatStorePrice(product.display_community_price)}
                </p>
              ) : null}
            </div>

            {product.variants.length > 0 ? (
              <fieldset className="mt-6">
                <legend className="text-sm font-semibold">Variante</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setVariantId(variant.id)}
                      className={cn(
                        "rounded-lg border px-4 py-2.5 text-sm font-medium transition",
                        variantId === variant.id
                          ? "border-[rgba(167,139,219,0.55)] bg-[rgba(167,139,219,0.12)] text-[var(--public-primary-hover)]"
                          : "border-[var(--public-border)] hover:border-[rgba(167,139,219,0.3)]",
                      )}
                      aria-pressed={variantId === variant.id}
                    >
                      {variant.name}
                    </button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <label className="text-sm font-semibold" htmlFor="qty">
                Cantidad
              </label>
              <input
                id="qty"
                type="number"
                min={1}
                max={Math.min(maxQty, stock ?? maxQty)}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="store-input w-24"
                disabled={isSoldOut}
              />
              {stock !== null ? (
                <span className="text-sm text-[var(--public-text-secondary)]">
                  {stock > 0 ? `${stock} disponibles` : "Sin stock"}
                </span>
              ) : null}
            </div>

            <div className="mt-8 hidden flex-wrap gap-3 lg:flex">
              <PublicButton
                type="button"
                variant="primary"
                size="lg"
                onClick={handleAddToCart}
                disabled={isSoldOut || adding}
              >
                {adding ? "Agregando..." : "Agregar al carrito"}
              </PublicButton>
              <PublicButton href={ROUTES.tiendaCarrito} variant="outline" size="lg">
                Ir al carrito
              </PublicButton>
            </div>

            <div
              ref={liveRef}
              className="mt-4 text-sm text-[var(--public-community)]"
              role="status"
              aria-live="polite"
            />

            <ul className="mt-8 space-y-2 text-sm text-[var(--public-text-secondary)]">
              <li>✦ Producto oficial de Australe.</li>
              {isLow ? <li>✦ Unidades limitadas.</li> : null}
              {isCommunityMember ? (
                <li>✦ Sumá puntos con esta compra.</li>
              ) : null}
              <li>✦ Compra segura con reserva de stock.</li>
            </ul>

            {product.description ? (
              <div className="store-surface mt-10 rounded-xl p-6">
                <h2 className="text-lg font-bold">Descripción</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[var(--public-text-secondary)]">
                  {product.description}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {relatedProducts.length > 0 ? (
          <section className="mt-16 border-t border-[var(--public-border)] pt-14">
            <h2 className="text-xl font-bold">También te puede interesar</h2>
            <div className="mt-6">
              <StoreProductGrid products={relatedProducts} eventSlug={eventSlug} />
            </div>
          </section>
        ) : null}
      </div>

      <div className="store-sticky-cta lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="text-sm text-[var(--public-primary-hover)]">
              {formatStorePrice(product.display_price)}
            </p>
          </div>
          <PublicButton
            type="button"
            variant="primary"
            className="shrink-0"
            onClick={handleAddToCart}
            disabled={isSoldOut || adding}
          >
            {isSoldOut ? "Agotado" : "Agregar"}
          </PublicButton>
        </div>
      </div>
    </>
  );
}
