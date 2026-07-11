import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { STORE_CATEGORIES } from "@/lib/store/utils";
import { cn } from "@/lib/utils/cn";

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  remeras: "Indumentaria esencial",
  buzos: "Comodidad con actitud",
  gorras: "Detalle urbano",
  accesorios: "Complementos únicos",
  posters: "Arte para tu espacio",
  packs: "Ediciones combinadas",
  ediciones: "Piezas especiales",
  general: "Explorá todo",
};

type StoreCategoryShowcaseProps = {
  activeCategory?: string | null;
  eventSlug?: string | null;
};

export function StoreCategoryShowcase({
  activeCategory,
  eventSlug,
}: StoreCategoryShowcaseProps) {
  const categories = STORE_CATEGORIES.filter((cat) => cat.value !== "general").slice(
    0,
    6,
  );

  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
            Colecciones
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Encontrá tu estilo
          </h2>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const params = new URLSearchParams({ categoria: category.value });
          if (eventSlug) {
            params.set("evento", eventSlug);
          }
          const href = `${ROUTES.tienda}?${params.toString()}`;
          const isActive = activeCategory === category.value;

          return (
            <Link
              key={category.value}
              href={href}
              className={cn(
                "group store-card-hover store-surface flex flex-col justify-between rounded-xl p-5 sm:p-6",
                isActive && "border-[rgba(167,139,219,0.35)]",
              )}
            >
              <div>
                <p className="text-lg font-semibold">{category.label}</p>
                <p className="mt-1 text-sm text-[var(--public-text-secondary)]">
                  {CATEGORY_DESCRIPTIONS[category.value] ?? "Ver productos"}
                </p>
              </div>
              <span className="mt-6 text-sm font-medium text-[var(--public-primary-hover)] transition group-hover:translate-x-1">
                Explorar →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
