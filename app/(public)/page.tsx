import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";

const eventos = [
  {
    id: 1,
    slug: "noche-australe",
    titulo: "Noche Australe",
    fecha: "Sábado 22 de junio",
    lugar: "Mendoza",
    precio: "$5.000",
    estado: "Entradas disponibles",
  },
  {
    id: 2,
    slug: "fiesta-comunidad",
    titulo: "Fiesta Comunidad",
    fecha: "Viernes 28 de junio",
    lugar: "Espacio Cultural",
    precio: "$4.000",
    estado: "Promo comunidad",
  },
  {
    id: 3,
    slug: "after-producciones",
    titulo: "After Producciones",
    fecha: "Sábado 6 de julio",
    lugar: "A confirmar",
    precio: "Próximamente",
    estado: "Muy pronto",
  },
];

const productos = [
  "Hamburguesas",
  "Papas",
  "Gaseosas",
  "Agua",
  "Snacks",
  "Combos",
];

export default function Home() {
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
              <div className="mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 sm:p-8">
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                  Evento destacado
                </p>
                <h2 className="mt-12 text-3xl font-black sm:mt-20 sm:text-4xl">
                  Noche Australe
                </h2>
                <p className="mt-3 text-white/80">
                  Música, comunidad y una experiencia distinta.
                </p>
              </div>

              <div className="grid gap-3 text-sm">
                <div className="flex justify-between rounded-2xl bg-white/5 p-4">
                  <span className="text-zinc-400">Fecha</span>
                  <span>Sábado 22 de junio</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white/5 p-4">
                  <span className="text-zinc-400">Entrada</span>
                  <span>$5.000</span>
                </div>
                <div className="flex justify-between rounded-2xl bg-white/5 p-4">
                  <span className="text-zinc-400">Estado</span>
                  <span className="text-emerald-300">Disponible</span>
                </div>
              </div>

              <Button
                href={ROUTES.evento("noche-australe")}
                variant="secondary"
                className="mt-6 w-full"
              >
                Ver evento
              </Button>
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
            Flyers, precios, stock de entradas, promociones y ventas — todo en
            un solo lugar.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {eventos.map((evento) => (
            <Card key={evento.id} className="transition hover:-translate-y-1 hover:bg-white/[0.07]">
              <div className="mb-6 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-500 sm:h-48">
                Flyer del evento
              </div>
              <p className="text-sm text-purple-300">{evento.fecha}</p>
              <h3 className="mt-2 text-2xl font-bold">{evento.titulo}</h3>
              <p className="mt-2 text-zinc-400">{evento.lugar}</p>
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xl font-bold">{evento.precio}</span>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">
                  {evento.estado}
                </span>
              </div>
              <Button
                href={ROUTES.eventoEntradas(evento.slug)}
                variant="secondary"
                className="mt-6 w-full"
              >
                Comprar entrada
              </Button>
            </Card>
          ))}
        </div>

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
