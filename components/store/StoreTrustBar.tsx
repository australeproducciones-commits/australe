const TRUST_ITEMS = [
  { title: "Productos oficiales", icon: "✦" },
  { title: "Compra segura", icon: "◈" },
  { title: "Stock limitado", icon: "◇" },
  { title: "Beneficios Comunidad", icon: "◎" },
] as const;

export function StoreTrustBar() {
  return (
    <section
      className="border-b border-[var(--public-border)]"
      aria-label="Beneficios de compra"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px sm:grid-cols-4">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-center gap-2 px-4 py-4 text-center sm:py-5"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <span className="text-sm text-[var(--public-primary)]" aria-hidden>
              {item.icon}
            </span>
            <span className="text-xs font-medium text-[var(--public-text-secondary)] sm:text-sm">
              {item.title}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
