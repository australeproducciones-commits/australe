import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { BRAND_LOGO_ON_DARK } from "@/lib/constants/branding";
import { ROUTES } from "@/lib/constants/routes";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(168,85,247,0.28),transparent),radial-gradient(ellipse_50%_40%_at_100%_50%,rgba(236,72,153,0.12),transparent),radial-gradient(ellipse_40%_30%_at_0%_80%,rgba(99,102,241,0.1),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(9,9,11,0.4))]" aria-hidden />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24 md:py-28">
        <Image
          src={BRAND_LOGO_ON_DARK}
          alt="Australe Producciones"
          width={320}
          height={120}
          priority
          className="h-auto w-[200px] object-contain sm:w-[260px] md:w-[300px]"
        />

        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-purple-400/25 bg-purple-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-purple-200">
          Productora de eventos
        </p>

        <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
          La cartelera que{" "}
          <span className="bg-gradient-to-r from-purple-200 via-fuchsia-200 to-pink-200 bg-clip-text text-transparent">
            no te podés perder
          </span>
        </h1>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400 sm:text-lg">
          Entradas, experiencias y noches únicas. Descubrí los próximos
          eventos de Australe y reservá tu lugar.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Button href="/#cartelera" size="lg" className="sm:min-w-[180px]">
            Ver cartelera
          </Button>
          <Button
            href={ROUTES.comunidad}
            variant="outline"
            size="lg"
            className="sm:min-w-[180px]"
          >
            Soy comunidad
          </Button>
        </div>
      </div>
    </section>
  );
}
