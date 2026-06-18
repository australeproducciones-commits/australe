import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

const BENEFITS = [
  "Preventas exclusivas",
  "Descuentos en eventos",
  "Invitaciones especiales",
  "Sorteos y sorpresas",
  "Participación en experiencias",
];

export function CommunitySection() {
  return (
    <section
      className="border-t public-section-alt"
      style={{ backgroundColor: "var(--public-bg-section)" }}
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Comunidad
          </p>
          <h2 className="public-heading mt-3 text-3xl font-black sm:text-4xl">
            Más que eventos, somos una comunidad.
          </h2>
          <p className="mt-4 text-base leading-relaxed public-text-muted">
            Sumate para enterarte primero, acceder a beneficios y ser parte de
            encuentros pensados para compartir.
          </p>
        </div>

        <div className="public-card rounded-3xl p-6 sm:p-8">
          <ul className="space-y-3">
            {BENEFITS.map((benefit) => (
              <li
                key={benefit}
                className="flex items-center gap-3 text-sm public-heading"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full public-success-icon"
                >
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>
          <Link
            href={ROUTES.comunidad}
            className="public-btn-primary mt-8 inline-flex w-full justify-center rounded-2xl px-8 py-4 text-sm font-semibold sm:w-auto"
          >
            Quiero sumarme
          </Link>
        </div>
      </div>
    </section>
  );
}
