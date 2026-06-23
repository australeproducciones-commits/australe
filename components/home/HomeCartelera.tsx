import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { ROUTES } from "@/lib/constants/routes";
import type { CarteleraEvent } from "@/lib/events/cartelera";

type HomeCarteleraProps = {
  items: CarteleraEvent[];
};

export function HomeCartelera({ items }: HomeCarteleraProps) {
  const gridItems = items.filter((item) => !item.featured);

  return (
    <section
      id="cartelera"
      className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Cartelera
          </p>
          <h2 className="public-heading mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Próximos eventos
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed public-text-soft md:text-right">
          Flyers, fechas, ubicación y entradas en un solo lugar.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="public-card rounded-3xl p-10 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl public-label"
            style={{ backgroundColor: "var(--public-card-tint)" }}
          >
            ✦
          </div>
          <h3 className="public-heading mt-5 text-xl font-bold">
            Cartelera en preparación
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed public-text-soft">
            Todavía no hay eventos publicados. Volvé pronto para conocer la
            próxima fecha de Australe Producciones.
          </p>
          <Link
            href={ROUTES.comunidad}
            className="public-btn-outline mt-8 inline-flex rounded-2xl px-6 py-3 text-sm font-semibold"
          >
            Unirme a la comunidad
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            {(gridItems.length > 0 ? gridItems : items).map((item) => (
              <EventCard
                key={item.event.id}
                event={item.event}
                minPrice={item.minPrice}
                minCommunityPrice={item.minCommunityPrice}
                featured={item.featured}
              />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href={ROUTES.eventos}
              className="public-btn-outline inline-flex rounded-2xl px-8 py-3 text-sm font-semibold"
            >
              Ver cartelera completa
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
