import Image from "next/image";
import Link from "next/link";
import { PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import type { PublicStoreProduct } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

type EventStoreMerchSectionProps = {
  eventSlug: string;
  eventName: string;
  products: PublicStoreProduct[];
};

export function EventStoreMerchSection({
  eventSlug,
  eventName,
  products,
}: EventStoreMerchSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <PublicCard padding="lg" className="mt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="public-heading text-xl font-bold sm:text-2xl">
            Merchandising disponible
          </h2>
          <p className="mt-2 text-sm public-text-muted">
            Descubrí los productos oficiales de {eventName} y reservá los tuyos
            para retirarlos durante la fecha.
          </p>
        </div>
        <PublicButton
          href={ROUTES.tiendaEvento(eventSlug)}
          variant="primary"
          size="sm"
          className="shrink-0"
        >
          Ver merch
        </PublicButton>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Link
            key={product.id}
            href={`${ROUTES.tiendaProducto(product.slug)}?evento=${encodeURIComponent(eventSlug)}`}
            className="group overflow-hidden rounded-xl border transition hover:-translate-y-0.5 hover:shadow-md"
            style={{ borderColor: "var(--public-border)" }}
          >
            <div className="relative aspect-square bg-[var(--public-card-tint)]">
              {product.main_image_url ? (
                <Image
                  src={product.main_image_url}
                  alt={product.name}
                  fill
                  className="object-cover transition group-hover:scale-[1.02]"
                  sizes="(max-width: 640px) 100vw, 320px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm public-text-muted">
                  Sin imagen
                </div>
              )}
            </div>
            <div className="p-3">
              <h3 className="public-heading line-clamp-2 text-sm font-semibold">
                {product.name}
              </h3>
              <p className="mt-1 text-sm font-medium text-[var(--public-primary-hover)]">
                {formatStorePrice(product.display_price)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </PublicCard>
  );
}
