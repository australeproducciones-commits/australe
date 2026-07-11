import type { Metadata } from "next";
import Link from "next/link";
import { StoreCatalogFilters } from "@/components/store/StoreCatalogFilters";
import {
  StoreCommunityBlock,
  StoreEmotionalBlock,
  StoreFinalCta,
} from "@/components/store/StoreHomeSections";
import { pickStoreHeroImage, StoreHomeHero } from "@/components/store/StoreHomeHero";
import { StoreProductGrid } from "@/components/store/StoreProductCard";
import { StoreCategoryShowcase } from "@/components/store/StoreCategoryShowcase";
import { StoreTrustBar } from "@/components/store/StoreTrustBar";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { getPublicStoreCollections, getPublicStoreProducts } from "@/lib/store/queries";

export const metadata: Metadata = {
  title: "Tienda oficial · Merchandising Australe",
  description:
    "Merchandising oficial de Australe Producciones. Productos exclusivos, ediciones limitadas y beneficios para la Comunidad Australe.",
  openGraph: {
    title: "Tienda oficial · Australe Producciones",
    description:
      "Llevá Australe con vos. Merchandising oficial para quienes forman parte de cada experiencia.",
    type: "website",
  },
};

type TiendaPageProps = {
  searchParams: Promise<{
    evento?: string;
    categoria?: string;
    q?: string;
  }>;
};

export default async function TiendaPage({ searchParams }: TiendaPageProps) {
  const params = await searchParams;
  const eventSlug = params.evento?.trim() || null;
  const event = eventSlug ? await getPublishedEventBySlug(eventSlug) : null;
  const hasFilters = Boolean(params.categoria || params.q);

  const [products, collections, allProducts] = await Promise.all([
    getPublicStoreProducts({
      category: params.categoria ?? null,
      q: params.q ?? null,
      eventId: event?.id ?? null,
    }),
    getPublicStoreCollections(),
    hasFilters
      ? Promise.resolve([])
      : getPublicStoreProducts({ eventId: event?.id ?? null }),
  ]);

  const catalogProducts = products;
  const featured = (hasFilters ? products : allProducts).filter((p) => p.is_featured);
  const heroImage = pickStoreHeroImage(hasFilters ? products : allProducts);

  return (
    <>
      <StoreHomeHero heroImageUrl={heroImage} eventName={event?.name} />
      <StoreTrustBar />

      {!hasFilters ? (
        <>
          {featured.length > 0 ? (
            <section
              id="destacados"
              className="mx-auto max-w-6xl scroll-mt-28 px-4 py-14 sm:px-6 sm:py-16"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
                    Selección curada
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                    Elegidos de Australe
                  </h2>
                </div>
              </div>
              <div className="mt-8">
                <StoreProductGrid
                  products={featured.slice(0, 8)}
                  eventSlug={eventSlug}
                />
              </div>
            </section>
          ) : null}

          <StoreCategoryShowcase
            activeCategory={params.categoria}
            eventSlug={eventSlug}
          />

          {collections.length > 0 ? (
            <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
                Colecciones
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {collections.map((collection) => (
                  <PublicButton
                    key={collection.id}
                    href={ROUTES.tiendaColeccion(collection.slug)}
                    variant="outline"
                    size="sm"
                  >
                    {collection.name}
                  </PublicButton>
                ))}
              </div>
            </section>
          ) : null}

          <StoreEmotionalBlock />
          <StoreCommunityBlock />
        </>
      ) : null}

      <section
        id="catalogo"
        className="mx-auto max-w-6xl scroll-mt-28 px-4 py-14 sm:px-6 sm:py-16"
      >
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
              Catálogo completo
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {hasFilters ? "Resultados" : "Todos los productos"}
            </h2>
          </div>
          <StoreCatalogFilters
            defaultQuery={params.q ?? ""}
            defaultCategory={params.categoria ?? ""}
            eventSlug={eventSlug}
          />
        </div>
        <div className="mt-8">
          <StoreProductGrid products={catalogProducts} eventSlug={eventSlug} />
        </div>
      </section>

      {!hasFilters ? <StoreFinalCta /> : null}

      {eventSlug ? (
        <div className="mx-auto max-w-6xl px-4 pb-8 text-center sm:px-6">
          <Link
            href={ROUTES.tienda}
            className="text-sm text-[var(--public-text-secondary)] underline-offset-2 hover:underline"
          >
            Ver tienda general
          </Link>
        </div>
      ) : null}
    </>
  );
}
