import type { Metadata } from "next";
import { StoreProductGrid } from "@/components/store/StoreProductCard";
import { PageContainer, PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { getPublishedEventBySlug } from "@/lib/events/queries";
import { getPublicStoreCollections, getPublicStoreProducts } from "@/lib/store/queries";
import { STORE_CATEGORIES } from "@/lib/store/utils";

export const metadata: Metadata = {
  title: "Tienda",
  description: "Merchandising oficial de Australe Producciones",
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

  const [products, collections] = await Promise.all([
    getPublicStoreProducts({
      category: params.categoria ?? null,
      q: params.q ?? null,
      eventId: event?.id ?? null,
    }),
    getPublicStoreCollections(),
  ]);

  const featured = products.filter((p) => p.is_featured);

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Tienda oficial
          </p>
          <h1 className="public-heading mt-2 text-3xl font-black sm:text-4xl">
            {event ? `Merch · ${event.name}` : "Merchandising Australe"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm public-text-muted">
            Productos oficiales, ediciones limitadas y merch de eventos. Reservá
            y retirá en la fecha.
          </p>
        </div>
        <PublicButton href={ROUTES.tiendaCarrito} variant="primary" size="sm">
          Ver carrito
        </PublicButton>
      </div>

      <form className="mb-8 flex flex-wrap gap-3">
        <input
          type="search"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar productos..."
          className="min-w-[200px] flex-1 rounded-xl border px-4 py-2 text-sm"
          style={{ borderColor: "var(--public-border)" }}
        />
        <select
          name="categoria"
          defaultValue={params.categoria ?? ""}
          className="rounded-xl border px-3 py-2 text-sm"
          style={{ borderColor: "var(--public-border)" }}
        >
          <option value="">Todas las categorías</option>
          {STORE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        {eventSlug ? (
          <input type="hidden" name="evento" value={eventSlug} />
        ) : null}
        <PublicButton type="submit" variant="outline" size="sm">
          Filtrar
        </PublicButton>
      </form>

      {collections.length > 0 ? (
        <section className="mb-10">
          <h2 className="public-heading text-lg font-bold">Colecciones</h2>
          <div className="mt-4 flex flex-wrap gap-3">
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

      {featured.length > 0 && !params.categoria && !params.q ? (
        <section className="mb-10">
          <h2 className="public-heading text-lg font-bold">Destacados</h2>
          <div className="mt-4">
            <StoreProductGrid products={featured.slice(0, 8)} eventSlug={eventSlug} />
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="public-heading text-lg font-bold">Catálogo</h2>
        <div className="mt-4">
          <StoreProductGrid products={products} eventSlug={eventSlug} />
        </div>
      </section>
    </PageContainer>
  );
}
