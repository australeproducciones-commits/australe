import Image from "next/image";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import type { PublicStoreProduct } from "@/lib/store/types";

type StoreHomeHeroProps = {
  heroImageUrl: string | null;
  eventName?: string | null;
};

export function StoreHomeHero({ heroImageUrl, eventName }: StoreHomeHeroProps) {
  return (
    <section className="store-hero-glow relative overflow-hidden border-b border-[var(--public-border)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-12 lg:py-24">
        <div className="store-fade-in relative z-10">
          <p className="store-badge">Tienda oficial</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.25rem]">
            {eventName ? (
              <>
                Merch de{" "}
                <span className="store-gradient-text">{eventName}</span>
              </>
            ) : (
              <>
                Llevá{" "}
                <span className="store-gradient-text">Australe</span> con vos
              </>
            )}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--public-text-secondary)] sm:text-lg">
            Merchandising oficial para quienes no solo viven el evento, sino que
            forman parte de él.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PublicButton href={`${ROUTES.tienda}#catalogo`} variant="primary" size="lg">
              Ver colección
            </PublicButton>
            <PublicButton href={`${ROUTES.tienda}#destacados`} variant="outline" size="lg">
              Explorar novedades
            </PublicButton>
          </div>
        </div>

        <div className="store-fade-in-delay relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--public-border)] shadow-2xl">
            {heroImageUrl ? (
              <>
                <Image
                  src={heroImageUrl}
                  alt="Merchandising oficial Australe"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(10,9,13,0.75) 0%, transparent 45%)",
                  }}
                />
              </>
            ) : (
              <div
                className="flex h-full items-center justify-center"
                style={{ background: "var(--public-image-fallback)" }}
              >
                <p className="text-sm text-[var(--public-text-soft)]">
                  Colección oficial Australe
                </p>
              </div>
            )}
          </div>
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full blur-3xl"
            style={{ background: "var(--store-glow-strong)" }}
            aria-hidden
          />
        </div>
      </div>
    </section>
  );
}

export function pickStoreHeroImage(products: PublicStoreProduct[]): string | null {
  const featured = products.find((p) => p.is_featured && p.main_image_url);
  if (featured?.main_image_url) {
    return featured.main_image_url;
  }
  const withImage = products.find((p) => p.main_image_url);
  return withImage?.main_image_url ?? null;
}
