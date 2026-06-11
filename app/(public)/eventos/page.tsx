import type { Metadata } from "next";
import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-300">
            Cartelera
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Próximos eventos
          </h1>
        </div>
        <p className="max-w-xl text-sm text-zinc-500">
          Eventos publicados de Australe Producciones.
        </p>
      </div>

      {carteleraItems.length === 0 ? (
        <Card
          padding="lg"
          className="border border-dashed border-white/10 bg-zinc-900/40 text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 text-2xl text-purple-300">
            ✦
          </div>
          <h2 className="mt-5 text-xl font-bold text-white">
            Cartelera en preparación
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500">
            Todavía no hay eventos publicados. Volvé pronto para ver la próxima
            fecha.
          </p>
          <Button href={ROUTES.home} variant="outline" className="mt-8">
            Volver al inicio
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
