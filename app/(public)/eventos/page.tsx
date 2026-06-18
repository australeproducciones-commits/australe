import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { ROUTES } from "@/lib/constants/routes";
import { buildCarteleraEvents } from "@/lib/events/cartelera";
import { getPublishedEvents } from "@/lib/events/queries";

export const metadata: Metadata = {
  title: "Cartelera",
};

export default async function EventosPage() {
  const events = await getPublishedEvents();
  const carteleraItems = await buildCarteleraEvents(events);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Cartelera
          </p>
          <h1 className="public-heading mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Próximos eventos
          </h1>
        </div>
        <p className="max-w-xl text-sm public-text-soft">
          Eventos publicados de Australe Producciones.
        </p>
      </div>

      {carteleraItems.length === 0 ? (
        <div className="public-card rounded-3xl p-10 text-center">
          <h2 className="public-heading text-xl font-bold">
            Cartelera en preparación
          </h2>
          <p className="mt-2 text-sm public-text-soft">
            Volvé pronto para ver la próxima fecha.
          </p>
          <Link
            href={ROUTES.home}
            className="public-btn-outline mt-8 inline-flex rounded-2xl px-6 py-3 text-sm font-semibold"
          >
            Volver al inicio
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {carteleraItems.map((item) => (
            <EventCard
              key={item.event.id}
              event={item.event}
              minPrice={item.minPrice}
              featured={item.featured}
            />
          ))}
        </div>
      )}
    </div>
  );
}
