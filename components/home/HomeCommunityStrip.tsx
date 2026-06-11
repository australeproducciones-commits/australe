import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants/routes";

export function HomeCommunityStrip() {
  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 md:flex-row md:items-center">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-pink-300">
            Comunidad Australe
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Beneficios y precios especiales
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            Registrate en la comunidad y accedé a descuentos en eventos
            seleccionados.
          </p>
        </div>
        <Button href={ROUTES.comunidad} size="lg" className="shrink-0">
          Conocer la comunidad
        </Button>
      </div>
    </section>
  );
}
