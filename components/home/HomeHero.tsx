import { EventImage } from "@/components/events/EventImage";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import Link from "next/link";

type HomeHeroProps = {
  featuredEvent?: Event | null;
};

export function HomeHero({ featuredEvent }: HomeHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[#E8DDF8] bg-gradient-to-br from-[#F8F3FF] via-[#FFF9F4] to-[#F1E8FF]">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="inline-flex rounded-full border border-[#E8DDF8] bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#8B7A99]">
            Comunidad · Cultura · Encuentros
          </p>

          <h1 className="mt-6 text-4xl font-black leading-[1.08] tracking-tight text-[#2F2A3A] sm:text-5xl">
            Creamos encuentros para compartir, disfrutar y pertenecer.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#6F647C] sm:text-lg">
            Australe Producciones organiza experiencias culturales, eventos y
            espacios de encuentro pensados para conectar personas reales.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ROUTES.eventos}
              className="public-btn-primary rounded-2xl px-8 py-4 text-center text-sm font-semibold transition"
            >
              Ver próximos eventos
            </Link>
            <Link
              href={ROUTES.comunidad}
              className="public-btn-outline rounded-2xl px-8 py-4 text-center text-sm font-semibold transition"
            >
              Conocer la comunidad
            </Link>
          </div>
        </div>

        <div className="public-card overflow-hidden rounded-3xl p-3 sm:p-4">
          {featuredEvent ? (
            <Link href={ROUTES.evento(featuredEvent.slug)} className="block">
              <EventImage
                event={featuredEvent}
                alt={featuredEvent.name}
                variant="banner"
              />
              <div className="px-2 pb-1 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9B7EDE]">
                  Próximo destacado
                </p>
                <p className="mt-1 text-lg font-bold text-[#2F2A3A]">
                  {featuredEvent.name}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex aspect-[12/5] flex-col items-center justify-center rounded-2xl bg-[#F1E8FF] text-center">
              <span className="text-3xl text-[#C8B6FF]">✦</span>
              <p className="mt-3 px-6 text-sm text-[#8B7A99]">
                Muy pronto anunciamos la próxima experiencia Australe.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
