import Link from "next/link";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

export function HomeInstitutionalSlide() {
  return (
    <article className="home-hero-slide home-hero-slide--institutional">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 55% 50% at 80% 20%, rgba(139, 92, 246, 0.22), transparent 60%), radial-gradient(ellipse 45% 40% at 12% 85%, rgba(167, 139, 219, 0.14), transparent 55%)",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-[min(72vh,720px)] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:min-h-[min(78vh,780px)] lg:justify-center lg:pb-24">
        <div className="max-w-2xl store-fade-in">
          <p className="store-badge home-hero-eyebrow">Experiencias que dejan huella</p>

          <h1 className="mt-5 text-[clamp(2.25rem,6vw,4rem)] font-black leading-[1.02] tracking-tight text-[var(--public-text)]">
            Viví algo que{" "}
            <span className="store-gradient-text">no se repite</span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--public-text-secondary)] sm:text-lg">
            Eventos, música y experiencias creadas para conectar personas, celebrar
            momentos y seguir formando comunidad.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <PublicButton href={ROUTES.eventos} size="lg" className="w-full sm:w-auto">
              Ver próximos eventos
            </PublicButton>
            <PublicButton
              href="#experiencia-australe"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Conocé Australe
            </PublicButton>
          </div>
        </div>
      </div>
    </article>
  );
}

export function HomeInstitutionalSlideCompact() {
  return (
    <article className="home-hero-slide home-hero-slide--institutional home-hero-slide--compact">
      <div className="relative z-10 mx-auto max-w-2xl px-6 py-16 text-center sm:px-8 sm:py-20">
        <p className="store-badge">Experiencias que dejan huella</p>
        <h1 className="mt-4 text-3xl font-black sm:text-4xl">
          Viví algo que no se repite
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--public-text-secondary)]">
          Muy pronto nuevas fechas de Australe Producciones.
        </p>
        <PublicButton href={ROUTES.eventos} size="lg" className="mt-8">
          Ver próximos eventos
        </PublicButton>
        <p className="mt-6 text-sm text-[var(--public-text-soft)]">
          ¿Todavía no sos parte?{" "}
          <Link href={ROUTES.comunidad} className="public-link font-medium">
            Conocé la comunidad
          </Link>
        </p>
      </div>
    </article>
  );
}
