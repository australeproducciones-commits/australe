import { HomeReveal } from "@/components/home/HomeReveal";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

export function HomeFinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20">
      <HomeReveal>
        <div className="home-final-cta relative overflow-hidden rounded-3xl border border-[var(--public-border)] px-6 py-12 text-center sm:px-10 sm:py-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-80"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 50% 0%, rgba(167, 139, 219, 0.2), transparent 65%), linear-gradient(180deg, var(--public-card-tint) 0%, var(--public-card) 100%)",
            }}
            aria-hidden
          />

          <div className="relative z-10">
            <h2
              className="text-3xl font-black tracking-tight sm:text-4xl"
              style={{ textWrap: "balance" }}
            >
              El próximo recuerdo empieza acá
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[var(--public-text-secondary)] sm:text-base">
              Descubrí los próximos eventos y preparate para vivir una nueva
              experiencia Australe.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PublicButton href={ROUTES.eventos} size="lg" className="w-full sm:w-auto">
                Ver próximos eventos
              </PublicButton>
              <PublicButton
                href={ROUTES.comunidad}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
              >
                Sumarme a la comunidad
              </PublicButton>
            </div>
          </div>
        </div>
      </HomeReveal>
    </section>
  );
}
