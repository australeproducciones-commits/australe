import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

const BENEFITS = [
  "Acumulá puntos con tus compras en tienda",
  "Accedé a precios especiales para miembros",
  "Productos exclusivos para la comunidad",
  "Viví Australe más allá del evento",
] as const;

export function StoreCommunityHeroSlide() {
  return (
    <article
      className="grid gap-10 lg:min-h-[720px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14"
      aria-label="Comunidad Australe"
    >
      <div className="relative z-10 order-1 lg:order-none">
        <p className="store-badge store-badge--community">Comunidad Australe</p>
        <h2 className="mt-5 max-w-xl text-[clamp(2rem,4.5vw,3.25rem)] font-black leading-[1.05] tracking-tight text-[var(--public-text)]">
          Ser parte tiene beneficios
        </h2>
        <ul className="mt-6 space-y-3 text-sm text-[var(--public-text-secondary)] sm:text-base">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex gap-3">
              <span className="text-[var(--public-community)]" aria-hidden>
                •
              </span>
              {benefit}
            </li>
          ))}
        </ul>
        <PublicButton href={ROUTES.comunidad} variant="outline" size="lg" className="mt-8 w-full sm:w-auto">
          Conocer la Comunidad
        </PublicButton>
      </div>

      <div
        className="relative order-2 min-h-[220px] overflow-hidden rounded-2xl lg:order-none lg:min-h-[420px]"
        aria-hidden
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(167,139,219,0.22) 0%, rgba(47,31,79,0.55) 45%, rgba(10,9,13,0.2) 100%), var(--public-card-tint)",
          }}
        />
        <div
          className="absolute -right-10 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full opacity-35 blur-3xl"
          style={{ backgroundColor: "var(--store-glow-strong)" }}
        />
        <div className="relative flex h-full flex-col justify-center px-8 py-10 text-[var(--public-text)] sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
            Miembros Australe
          </p>
          <p className="mt-4 max-w-sm text-2xl font-black leading-tight">
            Beneficios que siguen después del show
          </p>
        </div>
      </div>
    </article>
  );
}
