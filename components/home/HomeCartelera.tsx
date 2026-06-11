import { EventCard } from "@/components/events/EventCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import type { CarteleraEvent } from "@/lib/events/cartelera";

type HomeCarteleraProps = {
  items: CarteleraEvent[];
};

export function HomeCartelera({ items }: HomeCarteleraProps) {
  const featured = items.find((item) => item.featured);
  const rest = items.filter((item) => !item.featured);

  return (
    <section
      id="cartelera"
      className="relative mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-300">
            Cartelera
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Próximos eventos
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-zinc-500 md:text-right">
          Flyers, fechas, ubicación y entradas en un solo lugar.
        </p>
      </div>

      {items.length === 0 ? (
        <Card
          padding="lg"
          className="border border-dashed border-white/10 bg-zinc-900/40 text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 text-2xl text-purple-300">
            ✦
          </div>
          <h3 className="mt-5 text-xl font-bold text-white">
            Cartelera en preparación
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
            Todavía no hay eventos publicados. Volvé pronto para conocer la
            próxima fecha de Australe Producciones.
          </p>
          <Button href={ROUTES.comunidad} variant="outline" className="mt-8">
            Unirme a la comunidad
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {featured ? (
            <EventCard
              event={featured.event}
              minPrice={featured.minPrice}
              featured
              variant="spotlight"
            />
          ) : null}

          {rest.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((item) => (
                <EventCard
                  key={item.event.id}
                  event={item.event}
                  minPrice={item.minPrice}
                />
              ))}
            </div>
          ) : null}

          <div className="pt-4 text-center">
            <Button href={ROUTES.eventos} variant="outline">
              Ver cartelera completa
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
