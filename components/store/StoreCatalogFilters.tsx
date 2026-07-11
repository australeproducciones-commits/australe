import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { STORE_CATEGORIES } from "@/lib/store/utils";

type StoreCatalogFiltersProps = {
  defaultQuery?: string;
  defaultCategory?: string;
  eventSlug?: string | null;
};

export function StoreCatalogFilters({
  defaultQuery = "",
  defaultCategory = "",
  eventSlug,
}: StoreCatalogFiltersProps) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
      action={ROUTES.tienda}
      method="get"
      role="search"
    >
      <label className="sr-only" htmlFor="store-search">
        Buscar productos
      </label>
      <input
        id="store-search"
        type="search"
        name="q"
        defaultValue={defaultQuery}
        placeholder="Buscar productos..."
        className="store-input min-w-0 flex-1 sm:min-w-[220px]"
      />

      <label className="sr-only" htmlFor="store-category">
        Categoría
      </label>
      <select
        id="store-category"
        name="categoria"
        defaultValue={defaultCategory}
        className="store-input w-full sm:w-auto sm:min-w-[180px]"
      >
        <option value="">Todas las categorías</option>
        {STORE_CATEGORIES.map((cat) => (
          <option key={cat.value} value={cat.value}>
            {cat.label}
          </option>
        ))}
      </select>

      {eventSlug ? <input type="hidden" name="evento" value={eventSlug} /> : null}

      <button
        type="submit"
        className="rounded-xl bg-[var(--public-primary)] px-5 py-2.5 text-sm font-semibold text-[#0a090d] transition hover:bg-[var(--public-primary-hover)]"
      >
        Filtrar
      </button>

      {(defaultQuery || defaultCategory) && (
        <Link
          href={eventSlug ? ROUTES.tiendaEvento(eventSlug) : ROUTES.tienda}
          className="text-center text-sm text-[var(--public-text-secondary)] underline-offset-2 hover:underline sm:text-left"
        >
          Limpiar filtros
        </Link>
      )}
    </form>
  );
}
