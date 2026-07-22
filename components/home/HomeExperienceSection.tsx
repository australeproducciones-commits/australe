import { HomeReveal } from "@/components/home/HomeReveal";
import { SectionHeading } from "@/components/ui/public/SectionHeading";

const PILLARS = [
  {
    title: "Producción",
    description:
      "Cada detalle pensado para que la experiencia se sienta desde el primer momento.",
    icon: "✦",
  },
  {
    title: "Comunidad",
    description:
      "Una conexión que continúa incluso después de que termina el evento.",
    icon: "◎",
  },
  {
    title: "Momentos",
    description:
      "Encuentros que se convierten en historias para volver a contar.",
    icon: "◇",
  },
] as const;

export function HomeExperienceSection() {
  return (
    <section
      id="experiencia-australe"
      className="relative overflow-hidden border-y border-[var(--public-border)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 20% 50%, var(--store-glow), transparent 60%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <HomeReveal>
          <SectionHeading
            label="Experiencia Australe"
            title="No organizamos solamente eventos"
            subtitle="Creamos el lugar donde la música, las personas y los recuerdos se encuentran."
            align="start"
          />
        </HomeReveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {PILLARS.map((pillar, index) => (
            <HomeReveal key={pillar.title} delayMs={index * 80}>
              <article className="home-pillar-card store-surface h-full rounded-2xl p-6 sm:p-7">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg text-[var(--public-primary)]"
                  style={{ background: "rgba(167, 139, 219, 0.12)" }}
                  aria-hidden
                >
                  {pillar.icon}
                </span>
                <h3 className="mt-5 text-xl font-bold tracking-tight">{pillar.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--public-text-secondary)] sm:text-base">
                  {pillar.description}
                </p>
              </article>
            </HomeReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
