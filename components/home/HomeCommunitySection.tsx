import { HomeReveal } from "@/components/home/HomeReveal";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

const BENEFITS = [
  { label: "Puntos", description: "Acumulá con cada compra y participación" },
  { label: "Beneficios", description: "Precios y ventajas pensadas para miembros" },
  { label: "Sorteos", description: "Oportunidades exclusivas para la comunidad" },
  { label: "Experiencias", description: "Encuentros que van más allá del evento" },
  { label: "Acceso anticipado", description: "Entrá antes al contenido y las novedades" },
  { label: "Recompensas", description: "Premios y sorpresas para quienes siempre están" },
] as const;

export function HomeCommunitySection() {
  return (
    <section
      id="comunidad-australe"
      className="mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <HomeReveal>
        <div className="store-surface overflow-hidden rounded-3xl">
          <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="store-badge store-badge--community">Comunidad Australe</p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Ser parte tiene beneficios
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--public-text-secondary)]">
                Sumate a la comunidad Australe, acumulá puntos, participá de
                experiencias exclusivas y accedé a beneficios pensados para quienes
                siempre están.
              </p>
              <PublicButton href={ROUTES.comunidad} size="lg" className="mt-8">
                Sumarme a la comunidad
              </PublicButton>
            </div>

            <div
              className="grid grid-cols-2 gap-3 p-6 sm:p-8 lg:p-10"
              style={{
                background:
                  "linear-gradient(135deg, rgba(167,139,219,0.1) 0%, rgba(10,9,13,0) 65%), var(--public-card-tint)",
              }}
            >
              {BENEFITS.map((benefit, index) => (
                <HomeReveal key={benefit.label} delayMs={index * 50}>
                  <div className="home-benefit-chip rounded-2xl border border-[var(--public-border)] bg-[var(--public-card)]/60 p-4 backdrop-blur-sm">
                    <p className="text-sm font-bold text-[var(--public-community)]">
                      {benefit.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--public-text-secondary)]">
                      {benefit.description}
                    </p>
                  </div>
                </HomeReveal>
              ))}
            </div>
          </div>
        </div>
      </HomeReveal>
    </section>
  );
}
