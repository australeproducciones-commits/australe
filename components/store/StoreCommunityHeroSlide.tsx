import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const BENEFITS = [
  { label: "Acumulá puntos con tus compras en tienda", icon: "✦" },
  { label: "Accedé a precios especiales para miembros", icon: "◎" },
  { label: "Productos exclusivos para la comunidad", icon: "◆" },
  { label: "Viví Australe más allá del evento", icon: "✺" },
] as const;

export function StoreCommunityHeroSlide() {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-3xl border border-[var(--public-border)]",
        "lg:min-h-[720px]",
      )}
      aria-label="Comunidad Australe"
      style={{
        background:
          "radial-gradient(ellipse 90% 80% at 15% 20%, rgba(139, 92, 246, 0.22), transparent 55%), radial-gradient(ellipse 70% 60% at 85% 80%, rgba(212, 165, 116, 0.12), transparent 50%), linear-gradient(145deg, #120c1c 0%, #1f1235 42%, #0a0910 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-20 top-10 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--store-glow-strong)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: "rgba(242, 193, 78, 0.55)" }}
        aria-hidden
      />

      <div className="relative grid gap-10 px-6 py-10 sm:px-8 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12 lg:px-10 lg:py-14">
        <div className="order-1 z-10 lg:order-none">
          <p className="store-badge store-badge--community">Comunidad Australe</p>
          <h2 className="mt-5 max-w-xl text-[clamp(2.1rem,4.8vw,3.6rem)] font-black leading-[1.02] tracking-tight text-[var(--public-text)]">
            Ser parte tiene beneficios
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--public-text-secondary)] sm:text-lg">
            Sumate a la comunidad oficial y desbloqueá ventajas exclusivas en cada compra y
            experiencia Australe.
          </p>

          <ul className="mt-7 space-y-3.5">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit.label}
                className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-[var(--public-text)] backdrop-blur-sm sm:text-base"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{
                    color: "rgba(242, 193, 78, 0.95)",
                    background: "rgba(167, 139, 219, 0.16)",
                    boxShadow: "0 0 24px rgba(167, 139, 219, 0.2)",
                  }}
                  aria-hidden
                >
                  {benefit.icon}
                </span>
                <span className="pt-0.5">{benefit.label}</span>
              </li>
            ))}
          </ul>

          <Link
            href={ROUTES.comunidad}
            className="public-btn-primary mt-8 inline-flex w-full justify-center rounded-2xl px-8 py-4 text-sm font-semibold sm:w-auto"
          >
            Conocer la Comunidad
          </Link>
        </div>

        <div className="relative order-2 min-h-[280px] lg:order-none lg:min-h-[460px]">
          <div className="absolute inset-0 rounded-[1.75rem] border border-violet-300/15 bg-violet-500/10 backdrop-blur-md" />

          <div
            className="absolute left-1/2 top-1/2 w-[min(100%,320px)] -translate-x-1/2 -translate-y-1/2 rounded-[1.5rem] border border-white/15 p-5 shadow-2xl"
            style={{
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(47,31,79,0.55) 55%, rgba(10,9,13,0.85) 100%)",
              boxShadow: "0 28px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-violet-200/80">
                  Miembro Australe
                </p>
                <p className="mt-1 text-lg font-black text-white">Pase VIP</p>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold text-amber-100"
                style={{ background: "rgba(242, 193, 78, 0.18)" }}
              >
                ACTIVO
              </span>
            </div>

            <div
              className="mt-5 rounded-2xl border border-white/10 px-4 py-4"
              style={{ background: "rgba(0,0,0,0.22)" }}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-violet-200/70">
                Puntos acumulados
              </p>
              <p className="mt-2 text-4xl font-black tracking-tight text-white">1.280</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs font-semibold text-white/90">
              {["Descuentos", "Exclusivos", "Puntos", "Experiencias"].map((label) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/5 px-2 py-2.5 backdrop-blur-sm"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div
            className="absolute right-3 top-6 rounded-full border border-amber-200/25 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-amber-100/90"
            style={{ background: "rgba(242, 193, 78, 0.12)" }}
            aria-hidden
          >
            + Puntos
          </div>
          <div
            className="absolute bottom-8 left-2 rounded-2xl border border-violet-200/20 px-3 py-2 text-xs font-semibold text-violet-100"
            style={{ background: "rgba(139, 92, 246, 0.18)" }}
            aria-hidden
          >
            Precio comunidad
          </div>
        </div>
      </div>
    </article>
  );
}
