import Image from "next/image";
import Link from "next/link";
import { StoreProductImageFallback } from "@/components/store/StoreProductImageFallback";
import { ROUTES } from "@/lib/constants/routes";
import type { PublicStoreProduct } from "@/lib/store/types";
import {
  formatStorePrice,
  STORE_CATEGORIES,
  STORE_LOW_STOCK_THRESHOLD,
} from "@/lib/store/utils";
import { cn } from "@/lib/utils/cn";

function getCategoryLabel(value: string): string {
  return STORE_CATEGORIES.find((cat) => cat.value === value)?.label ?? value;
}

type StoreProductCardProps = {
  product: PublicStoreProduct;
  eventSlug?: string | null;
  className?: string;
  priority?: boolean;
};

export function StoreProductCard({
  product,
  eventSlug,
  className,
  priority = false,
}: StoreProductCardProps) {
  const href = eventSlug
    ? `${ROUTES.tiendaProducto(product.slug)}?evento=${encodeURIComponent(eventSlug)}`
    : ROUTES.tiendaProducto(product.slug);

  const stock = product.track_stock ? product.available_qty : null;
  const isLow =
    stock !== null && stock > 0 && stock <= STORE_LOW_STOCK_THRESHOLD;
  const isSoldOut = stock !== null && stock <= 0;
  const hasVariants = product.variants.length > 0;

  return (
    <article
      className={cn(
        "store-card-hover store-surface group flex h-full flex-col overflow-hidden rounded-xl",
        className,
      )}
    >
      <Link href={href} className="store-image-zoom relative block aspect-[3/4] overflow-hidden">
        {product.main_image_url ? (
          <Image
            src={product.main_image_url}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            priority={priority}
          />
        ) : (
          <StoreProductImageFallback name={product.name} compact />
        )}

        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
          {product.community_only ? (
            <span className="store-badge store-badge--community">Exclusivo</span>
          ) : null}
          {product.is_featured ? (
            <span className="store-badge">Destacado</span>
          ) : null}
          {isSoldOut ? (
            <span className="store-badge store-badge--soldout">Agotado</span>
          ) : isLow ? (
            <span className="store-badge store-badge--low">Pocas unidades</span>
          ) : null}
        </div>

        {isSoldOut ? (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(10,9,13,0.55)" }}
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-[var(--public-text)]">
              Agotado
            </span>
          </div>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--public-text-soft)]">
          {getCategoryLabel(product.category)}
        </p>
        <Link href={href} className="mt-1.5 focus-visible:outline-none">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[var(--public-text)] transition group-hover:text-[var(--public-primary-hover)]">
            {product.name}
          </h3>
        </Link>

        {product.short_description ? (
          <p className="mt-2 line-clamp-2 text-xs text-[var(--public-text-secondary)]">
            {product.short_description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-lg font-bold text-[var(--public-text)]">
              {formatStorePrice(product.display_price)}
            </p>
            {product.display_community_price != null &&
            product.display_community_price < product.display_price ? (
              <p className="text-xs text-[var(--public-community)]">
                Comunidad {formatStorePrice(product.display_community_price)}
              </p>
            ) : null}
          </div>

          <Link
            href={href}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold transition",
              "border-[var(--public-border)] hover:border-[rgba(167,139,219,0.4)] hover:bg-[rgba(167,139,219,0.1)]",
              isSoldOut && "pointer-events-none opacity-50",
            )}
            aria-label={
              hasVariants
                ? `Ver opciones de ${product.name}`
                : `Ver ${product.name}`
            }
          >
            {hasVariants ? "Elegir" : "Ver"}
          </Link>
        </div>
      </div>
    </article>
  );
}

export function StoreProductCardSkeleton() {
  return (
    <div className="store-surface overflow-hidden rounded-xl">
      <div className="store-skeleton aspect-[3/4]" />
      <div className="space-y-3 p-5">
        <div className="store-skeleton h-3 w-16 rounded" />
        <div className="store-skeleton h-5 w-3/4 rounded" />
        <div className="store-skeleton h-4 w-full rounded" />
        <div className="flex justify-between pt-2">
          <div className="store-skeleton h-6 w-20 rounded" />
          <div className="store-skeleton h-8 w-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function StoreProductGrid({
  products,
  eventSlug,
  emptyMessage = "No hay productos disponibles en este momento.",
}: {
  products: PublicStoreProduct[];
  eventSlug?: string | null;
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="store-surface rounded-2xl px-6 py-16 text-center">
        <p className="text-[var(--public-text-secondary)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <StoreProductCard
          key={product.id}
          product={product}
          eventSlug={eventSlug}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
