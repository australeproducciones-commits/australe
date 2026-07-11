import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const BENEFITS = [
  "Acumulá puntos con tus compras en tienda",
  "Accedé a precios especiales para miembros",
  "Productos exclusivos para la comunidad",
  "Viví Australe más allá del evento",
] as const;

type CommunityHeroSlideProps = {
  className?: string;
};

export function CommunityHeroSlide({ className }: CommunityHeroSlideProps) {
  return (
    <article
      className={cn("public-card overflow-hidden rounded-3xl", className)}
      aria-label="Comunidad Australe"
    >
      <div className="grid min-h-[280px] lg:grid-cols-2 lg:min-h-[360px]">
        <div className="flex flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Comunidad Australe
          </p>
          <h2 className="public-heading mt-3 text-balance text-2xl font-black leading-tight sm:text-3xl lg:text-4xl">
            Ser parte tiene beneficios
          </h2>
          <ul className="mt-6 space-y-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-start gap-3 text-sm public-heading sm:text-base"
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full public-success-icon text-xs font-bold"
                  aria-hidden
                >
                  ✓
                </span>
                <span>{benefit}</span>
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

        <div
          className="relative hidden overflow-hidden lg:block"
          aria-hidden
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #2f1f4f 0%, #4a2f7a 38%, #6b4fa8 72%, #9b7ede 100%)",
            }}
          />
          <div
            className="absolute -right-16 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
            style={{ backgroundColor: "#c8b6ff" }}
          />
          <div
            className="absolute bottom-8 left-8 h-40 w-40 rounded-full opacity-20 blur-2xl"
            style={{ backgroundColor: "#f2c14e" }}
          />
          <div className="relative flex h-full flex-col justify-center px-10 py-12 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              Miembros Australe
            </p>
            <p className="mt-4 max-w-sm text-2xl font-black leading-tight text-white">
              Beneficios que siguen después del show
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {["Puntos", "Descuentos", "Exclusivos", "Experiencias"].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-semibold backdrop-blur-sm"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
