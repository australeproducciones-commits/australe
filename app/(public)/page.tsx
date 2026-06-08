import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventCard } from "@/components/events/EventCard";
import { EventFlyer } from "@/components/events/EventFlyer";
import { ROUTES } from "@/lib/constants/routes";
import {
  getFeaturedPublishedEvent,
  getPublishedEvents,
} from "@/lib/events/queries";
import { formatEventDateTime } from "@/lib/events/utils";

const productos = [
  "Hamburguesas",
  "Papas",
  "Gaseosas",
  "Agua",
  "Snacks",
  "Combos",
];

export default async function Home() {
  const [featuredEvent, publishedEvents] = await Promise.all([
    getFeaturedPublishedEvent(),
    getPublishedEvents(),
  ]);

  const upcomingEvents = publishedEvents
    .filter((event) => event.id !== featuredEvent?.id)
    .slice(0, 3);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_30%)]" />

        <div className="relative mx-auto grid min-h-[600px] max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2 md:min-h-[720px]">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-2 text-sm text-purple-200">
              Eventos · Entradas · Comunidad
            </p>

            <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-7xl">
              Viví la noche con{" "}
              <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Australe
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-zinc-300 sm:text-lg">
              Una plataforma simple para mostrar eventos, vender entradas,
              registrar comunidad con descuentos y controlar productos de
              cocina o kiosco.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button href={ROUTES.eventos} size="lg">
                Ver próximos eventos
              </Button>
              <Button href={ROUTES.comunidad} variant="outline" size="lg">
                Sumarse a la comunidad
              </Button>
            </div>
          </div>

          <Card className="shadow-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/50 p-4 sm:p-6">
              {featuredEvent ? (
                <>
                  <EventFlyer event={featuredEvent} variant="hero" className="mb-6" />
                  <p className="text-sm uppercase tracking-[0.4em] text-purple-300">
                    Evento destacado
                  </p>
                  <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                    {featuredEvent.name}
                  </h2>
                  <p className="mt-3 text-zinc-400">
                    {formatEventDateTime(
                      featuredEvent.event_date,
                      featuredEvent.start_time,
                      featuredEvent.end_time,
                    )}
                  </p>
                  <div className="mt-6 grid gap-3 text-sm">
                    <div className="flex justify-between rounded-2xl bg-white/5 p-4">
                      <span className="text-zinc-400">Lugar</span>
                      <span>{featuredEvent.location_name ?? "A confirmar"}</span>
                    </div>
                    <div className="flex justify-between rounded-2xl bg-white/5 p-4">
                      <span className="text-zinc-400">Estado</span>
                      <span className="text-emerald-300">Publicado</span>
                    </div>
                  </div>
                  <Button
                    href={ROUTES.evento(featuredEvent.slug)}
                    variant="secondary"
                    className="mt-6 w-full"
                  >
                    Ver evento
                  </Button>
                </>
              ) : (
                <>
                  <div className="mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 sm:p-8">
                    <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                      Evento destacado
                    </p>
                    <h2 className="mt-12 text-3xl font-black sm:mt-20 sm:text-4xl">
                      Próximamente
                    </h2>
                    <p className="mt-3 text-white/80">
                      Muy pronto anunciamos la próxima noche Australe.
                    </p>
                  </div>
                  <Button href={ROUTES.eventos} variant="secondary" className="w-full">
                    Ver eventos
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
              Agenda
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Próximos eventos
            </h2>
          </div>
          <p className="max-w-xl text-zinc-400">
            Flyers, fechas, lugares y acceso a entradas en un solo lugar.
          </p>
        </div>

        {upcomingEvents.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-zinc-400">No hay más eventos publicados por ahora.</p>
            <Button href={ROUTES.eventos} variant="outline" className="mt-6">
              Ver agenda
            </Button>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Button href={ROUTES.eventos} variant="outline">
            Ver todos los eventos
          </Button>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-pink-300">
              Comunidad Australe
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Registro con beneficios y descuentos
            </h2>
            <p className="mt-6 text-base leading-8 text-zinc-300 sm:text-lg">
              Registrate, quedá dentro de la comunidad y accedé a precios
              especiales en eventos seleccionados.
            </p>
            <Button href={ROUTES.comunidad} className="mt-8">
              Ir a comunidad
            </Button>
          </div>

          <Card className="bg-black/40">
            <div className="grid gap-4">
              <input
                placeholder="Nombre completo"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-zinc-500"
                disabled
              />
              <input
                placeholder="WhatsApp"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-zinc-500"
                disabled
              />
              <input
                placeholder="Email"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-zinc-500"
                disabled
              />
              <Button href={ROUTES.comunidad} className="w-full">
                Registrarme
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
            Cocina / Kiosco
          </p>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">
            Control de productos vendidos
          </h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Próximamente: stock, ventas por evento y caja conectados a la base
            de datos.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {productos.map((producto) => (
            <Card key={producto}>
              <p className="text-xl font-bold">{producto}</p>
              <p className="mt-2 text-sm text-zinc-400">
                Producto disponible para venta interna.
              </p>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
