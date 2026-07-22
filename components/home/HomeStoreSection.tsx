import { HomeReveal } from "@/components/home/HomeReveal";
import { StoreProductGrid } from "@/components/store/StoreProductCard";
import { PublicButton } from "@/components/ui/public";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import { ROUTES } from "@/lib/constants/routes";
import { getPublicStoreProducts } from "@/lib/store/queries";

export async function HomeStoreSection() {
  const products = await getPublicStoreProducts();
  const featured = products.filter((product) => product.is_featured).slice(0, 4);
  const showcase = featured.length > 0 ? featured : products.slice(0, 4);

  if (showcase.length === 0) {
    return null;
  }

  return (
    <section
      id="tienda-oficial"
      className="relative overflow-hidden border-y border-[var(--public-border)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 85% 30%, rgba(212, 165, 116, 0.08), transparent 60%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
        <HomeReveal>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <SectionHeading
              label="Tienda oficial"
              title="Llevá Australe con vos"
              subtitle="Merchandising oficial para quienes no solo viven el evento, sino que forman parte de él."
              align="start"
              className="lg:max-w-2xl"
            />
            <PublicButton
              href={ROUTES.tienda}
              variant="outline"
              className="shrink-0 self-start lg:self-auto"
            >
              Descubrir la tienda
            </PublicButton>
          </div>
        </HomeReveal>

        <HomeReveal className="mt-10" delayMs={80}>
          <StoreProductGrid products={showcase} />
        </HomeReveal>
      </div>
    </section>
  );
}
