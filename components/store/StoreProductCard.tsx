import Image from "next/image";
import Link from "next/link";
import { StoreMerchBadge } from "@/components/store/StoreMerchBadge";
import { StoreProductImageFallback } from "@/components/store/StoreProductImageFallback";
import { ROUTES } from "@/lib/constants/routes";
import type { PublicStoreProduct } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";
import { cn } from "@/lib/utils/cn";

type StoreProductCardProps = {
  product: PublicStoreProduct;
  eventSlug?: string | null;
  className?: string;
};

export function StoreProductCard({
  product,
  eventSlug,
  className,
}: StoreProductCardProps) {
  const href = eventSlug
    ? `${ROUTES.tiendaProducto(product.slug)}?evento=${encodeURIComponent(eventSlug)}`
    : ROUTES.tiendaProducto(product.slug);

  const stock = product.track_stock ? product.available_qty : null;
  const isLow = stock !== null && stock > 0 && stock <= 5;
  const isSoldOut = stock !== null && stock <= 0;

  return (
    <article
      className={cn(
        "group public-card flex h-full flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
      style={{ borderColor: "var(--public-border)" }}
    >
      <Link href={href} className="flex h-full flex-col">
        <div className="relative aspect-[4/5] bg-[var(--public-card-tint)]">
          {product.main_image_url ? (
            <Image
              src={product.main_image_url}
              alt={product.name}
              fill
              className="object-cover transition group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 50vw, 280px"
            />
          ) : (
            <StoreProductImageFallback name={product.name} compact />
          )}
          {product.community_only ? (
            <span className="absolute left-2 top-2 rounded-full bg-[rgba(155,126,222,0.9)] px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
              Comunidad
            </span>
          ) : null}
          {product.is_featured ? (
            <span className="absolute right-2 top-2">
              <StoreMerchBadge label="Destacado" size="compact" />
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-4">
          <h3 className="public-heading line-clamp-2 text-base font-bold">
            {product.name}
          </h3>
          {product.short_description ? (
            <p className="mt-1 line-clamp-2 text-xs public-text-muted">
              {product.short_description}
            </p>
          ) : null}

          <div className="mt-auto space-y-1 pt-3">
            <p className="text-sm font-semibold text-[var(--public-primary-hover)]">
              {formatStorePrice(product.display_price)}
            </p>
            {product.display_community_price != null &&
            product.display_community_price < product.display_price ? (
              <p className="text-xs public-text-muted">
                Comunidad {formatStorePrice(product.display_community_price)}
              </p>
            ) : null}
            {isSoldOut ? (
              <p className="text-xs font-medium text-[#8a4545]">Agotado</p>
            ) : isLow ? (
              <p className="text-xs font-medium text-[#7a5a18]">Últimas unidades</p>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

export function StoreProductGrid({
  products,
  eventSlug,
}: {
  products: PublicStoreProduct[];
  eventSlug?: string | null;
}) {
  if (products.length === 0) {
    return (
      <p className="py-12 text-center public-text-muted">
        No hay productos disponibles en este momento.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <StoreProductCard
          key={product.id}
          product={product}
          eventSlug={eventSlug}
        />
      ))}
    </div>
  );
}
