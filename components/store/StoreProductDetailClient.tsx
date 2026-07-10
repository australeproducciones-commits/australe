"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { StoreProductImageFallback } from "@/components/store/StoreProductImageFallback";
import { PageContainer, PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import type { PublicStoreProduct } from "@/lib/store/types";
import { formatStorePrice, getStoreStockAvailable } from "@/lib/store/utils";

type StoreProductDetailClientProps = {
  product: PublicStoreProduct;
  eventSlug?: string | null;
  isCommunityMember: boolean;
};

export function StoreProductDetailClient({
  product,
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
  const [activeImage, setActiveImage] = useState(
    product.main_image_url ?? product.gallery_urls[0] ?? null,
  );

  const galleryImages = [
    ...(product.main_image_url ? [product.main_image_url] : []),
    ...product.gallery_urls.filter((url) => url !== product.main_image_url),
  ];

  const selectedVariant =
    product.variants.find((v) => v.id === variantId) ?? null;

  const stock = getStoreStockAvailable(product, selectedVariant);
  const maxQty = product.max_per_order ?? (stock ?? 99);

  function handleAddToCart() {
    if (product.variants.length > 0 && !variantId) {
      setMessage("Elegí una variante.");
      return;
    }

    if (stock !== null && quantity > stock) {
      setMessage("No hay stock suficiente.");
      return;
    }

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
  }

  return (
    <PageContainer>
      <PublicButton
        href={eventSlug ? ROUTES.tiendaEvento(eventSlug) : ROUTES.tienda}
        variant="ghost"
        size="sm"
        className="mb-6"
      >
        ← Volver a la tienda
      </PublicButton>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-3xl bg-[var(--public-card-tint)]">
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
            <div className="mt-3 flex flex-wrap gap-2">
              {galleryImages.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(url)}
                  className={`relative h-16 w-16 overflow-hidden rounded-xl border ${
                    activeImage === url
                      ? "border-[var(--public-primary)]"
                      : "border-[var(--public-border)]"
                  }`}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <h1 className="public-heading text-3xl font-black">{product.name}</h1>
          {product.short_description ? (
            <p className="mt-2 text-sm public-text-muted">{product.short_description}</p>
          ) : null}

          <div className="mt-4 space-y-1">
            <p className="text-2xl font-bold text-[var(--public-primary-hover)]">
              {formatStorePrice(product.display_price)}
            </p>
            {isCommunityMember && product.display_community_price != null ? (
              <p className="text-sm public-text-muted">
                Precio comunidad{" "}
                {formatStorePrice(product.display_community_price)}
              </p>
            ) : null}
          </div>

          {product.community_only ? (
            <p className="mt-3 text-sm font-medium text-[var(--public-primary-hover)]">
              Producto exclusivo para miembros de la comunidad.
            </p>
          ) : null}

          {product.variants.length > 0 ? (
            <div className="mt-6">
              <p className="text-sm font-semibold">Variante</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setVariantId(variant.id)}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      variantId === variant.id
                        ? "border-[var(--public-primary)] bg-[var(--public-card-tint)]"
                        : ""
                    }`}
                  >
                    {variant.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
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
              className="w-20 rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "var(--public-border)" }}
            />
            {stock !== null ? (
              <span className="text-xs public-text-muted">
                {stock > 0 ? `${stock} disponibles` : "Agotado"}
              </span>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <PublicButton
              type="button"
              variant="primary"
              onClick={handleAddToCart}
              disabled={stock === 0}
            >
              Agregar al carrito
            </PublicButton>
            <PublicButton href={ROUTES.tiendaCarrito} variant="outline">
              Ir al carrito
            </PublicButton>
          </div>

          {message ? (
            <p className="mt-4 text-sm public-text-muted">{message}</p>
          ) : null}

          {product.description ? (
            <PublicCard padding="md" className="mt-8">
              <h2 className="public-heading text-lg font-bold">Descripción</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm public-text-muted">
                {product.description}
              </p>
            </PublicCard>
          ) : null}
        </div>
      </div>
    </PageContainer>
  );
}
