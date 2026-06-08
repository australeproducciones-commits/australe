const eventos = [
  {
    id: 1,
    titulo: "Noche Australe",
    fecha: "Sábado 22 de junio",
    lugar: "Mendoza",
    precio: "$5.000",
    estado: "Entradas disponibles",
  },
  {
    id: 2,
    titulo: "Fiesta Comunidad",
    fecha: "Viernes 28 de junio",
    lugar: "Espacio Cultural",
    precio: "$4.000",
    estado: "Promo comunidad",
  },
  {
    id: 3,
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
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 bg-black/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-lg font-bold tracking-wide">Australe</p>
            <p className="text-xs uppercase tracking-[0.3em] text-purple-300">
              Producciones
            </p>
          </div>

          <nav className="hidden gap-6 text-sm text-zinc-300 md:flex">
            <a href="#eventos" className="hover:text-white">
              Eventos
            </a>
            <a href="#comunidad" className="hover:text-white">
              Comunidad
            </a>
            <a href="#kiosco" className="hover:text-white">
              Cocina / Kiosco
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.35),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.18),transparent_30%)]" />

        <div className="relative mx-auto grid min-h-[720px] max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full border border-purple-400/30 bg-purple-400/10 px-4 py-2 text-sm text-purple-200">
              Eventos · Entradas · Comunidad
            </p>

            <h1 className="text-5xl font-black tracking-tight md:text-7xl">
              Viví la noche con{" "}
              <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent">
                Australe
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-300">
              Una plataforma simple para mostrar eventos, vender entradas,
              registrar comunidad con descuentos y controlar productos de
              cocina o kiosco.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a
                href="#eventos"
                className="rounded-full bg-purple-500 px-8 py-4 text-center font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:bg-purple-400"
              >
                Ver próximos eventos
              </a>

              <a
                href="#comunidad"
                className="rounded-full border border-white/20 px-8 py-4 text-center font-semibold transition hover:bg-white hover:text-black"
              >
                Sumarse a la comunidad
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-[1.5rem] border border-white/10 bg-black/50 p-6">
              <div className="mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 p-8">
                <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                  Evento destacado
                </p>
                <h2 className="mt-20 text-4xl font-black">Noche Australe</h2>
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
            </div>
          </div>
        </div>
      </section>

      <section id="eventos" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
              Agenda
            </p>
            <h2 className="mt-3 text-4xl font-black">Próximos eventos</h2>
          </div>

          <p className="max-w-xl text-zinc-400">
            Acá después vamos a cargar flyers, precios, stock de entradas,
            promociones y ventas.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {eventos.map((evento) => (
            <article
              key={evento.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:bg-white/[0.07]"
            >
              <div className="mb-6 flex h-48 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-500">
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

              <button className="mt-6 w-full rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-purple-200">
                Comprar entrada
              </button>
            </article>
          ))}
        </div>
      </section>

      <section id="comunidad" className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-24 md:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-pink-300">
              Comunidad Australe
            </p>
            <h2 className="mt-3 text-4xl font-black">
              Registro con beneficios y descuentos
            </h2>
            <p className="mt-6 text-lg leading-8 text-zinc-300">
              La idea es que cada persona pueda registrarse, quedar dentro de la
              comunidad y acceder a precios especiales en eventos seleccionados.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
            <div className="grid gap-4">
              <input
                placeholder="Nombre completo"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-zinc-500"
              />
              <input
                placeholder="WhatsApp"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-zinc-500"
              />
              <input
                placeholder="Email"
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 outline-none placeholder:text-zinc-500"
              />
              <button className="rounded-2xl bg-purple-500 px-5 py-4 font-semibold transition hover:bg-purple-400">
                Registrarme
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="kiosco" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
            Cocina / Kiosco
          </p>
          <h2 className="mt-3 text-4xl font-black">
            Control de productos vendidos
          </h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Más adelante esto se conecta a base de datos para controlar stock,
            ventas por evento y caja.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {productos.map((producto) => (
            <div
              key={producto}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-6"
            >
              <p className="text-xl font-bold">{producto}</p>
              <p className="mt-2 text-sm text-zinc-400">
                Producto disponible para venta interna.
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-sm text-zinc-500">
        Australe Producciones · Sistema de eventos y comunidad
      </footer>
    </main>
  );
}