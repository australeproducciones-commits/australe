import { EventCard } from "@/components/events/EventCard";
import { HomeReveal } from "@/components/home/HomeReveal";
import { PublicButton } from "@/components/ui/public";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import { ROUTES } from "@/lib/constants/routes";
import type { CarteleraEvent } from "@/lib/events/cartelera";

type HomeEventsSectionProps = {
  items: CarteleraEvent[];
};

export function HomeEventsSection({ items }: HomeEventsSectionProps) {
  const gridItems = items.filter((item) => !item.featured);

  return (
    <section
      id="cartelera"
      className="relative mx-auto max-w-6xl scroll-mt-28 px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <HomeReveal>
        <SectionHeading
          label="Cartelera"
          title="Lo próximo se vive con Australe"
          subtitle="Descubrí las experiencias que estamos preparando y asegurá tu lugar."
        />
      </HomeReveal>

      {items.length === 0 ? (
        <HomeReveal className="mt-10" delayMs={80}>
          <div className="store-surface mx-auto max-w-2xl rounded-3xl p-10 text-center">
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl text-[var(--public-primary)]"
              style={{ backgroundColor: "rgba(167, 139, 219, 0.12)" }}
            >
              ✦
            </div>
            <h3 className="mt-5 text-xl font-bold">Cartelera en preparación</h3>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--public-text-secondary)]">
              Todavía no hay eventos publicados. Volvé pronto para conocer la
              próxima fecha de Australe Producciones.
            </p>
            <PublicButton href={ROUTES.comunidad} variant="outline" className="mt-8">
              Unirme a la comunidad
            </PublicButton>
          </div>
        </HomeReveal>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {(gridItems.length > 0 ? gridItems : items).map((item, index) => (
              <HomeReveal key={item.event.id} delayMs={index * 60}>
                <div className="home-event-card h-full">
                  <EventCard
                    event={item.event}
                    minPrice={item.minPrice}
                    minCommunityPrice={item.minCommunityPrice}
                    featured={item.featured}
                    storeMerch={item.storeMerch}
                  />
                </div>
              </HomeReveal>
            ))}
          </div>

          <HomeReveal className="mt-12 text-center" delayMs={120}>
            <PublicButton href={ROUTES.eventos} variant="outline" size="lg">
              Ver todos los eventos
            </PublicButton>
          </HomeReveal>
        </>
      )}
    </section>
  );
}
