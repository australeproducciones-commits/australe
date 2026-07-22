const TRUST_ITEMS = [
  {
    icon: "✦",
    title: "Eventos cuidadosamente producidos",
  },
  {
    icon: "◈",
    title: "Entradas digitales y acceso seguro",
  },
  {
    icon: "◇",
    title: "Experiencias para compartir",
  },
  {
    icon: "◎",
    title: "Comunidad con beneficios exclusivos",
  },
] as const;

export function HomeTrustBar() {
  return (
    <section
      className="home-trust-bar border-b border-[var(--public-border)]"
      aria-label="Por qué confiar en Australe"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px lg:grid-cols-4">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex flex-col items-center justify-center gap-2 px-4 py-5 text-center sm:flex-row sm:py-6"
          >
            <span
              className="text-base text-[var(--public-primary)]"
              aria-hidden
            >
              {item.icon}
            </span>
            <span className="text-xs font-medium leading-snug text-[var(--public-text-secondary)] sm:text-sm">
              {item.title}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
