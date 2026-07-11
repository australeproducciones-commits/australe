import Link from "next/link";
import { PUBLIC_NAV_LINKS, ROUTES } from "@/lib/constants/routes";

export function StoreFooter() {
  return (
    <footer
      className="mt-16 border-t"
      style={{ borderColor: "var(--public-border)" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-lg font-bold tracking-tight">Australe Producciones</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--public-text-secondary)]">
              Merchandising oficial de una productora que une música, eventos y
              comunidad en Mendoza.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--public-text-soft)]">
              Explorar
            </p>
            <nav className="mt-4 flex flex-col gap-2 text-sm text-[var(--public-text-secondary)]">
              {PUBLIC_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-[var(--public-primary-hover)]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={ROUTES.contacto}
                className="transition hover:text-[var(--public-primary-hover)]"
              >
                Contacto
              </Link>
            </nav>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[var(--public-text-soft)]">
              Comunidad
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--public-text-secondary)]">
              Sumate a la Comunidad Australe para acceder a beneficios, precios
              especiales y experiencias exclusivas.
            </p>
            <Link
              href={ROUTES.comunidad}
              className="mt-4 inline-flex text-sm font-semibold text-[var(--public-primary-hover)] transition hover:underline"
            >
              Conocer la Comunidad →
            </Link>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col gap-3 border-t pt-6 text-xs text-[var(--public-text-soft)] sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--public-border)" }}
        >
          <p>© {new Date().getFullYear()} Australe Producciones</p>
          <p>Productos oficiales · Compra segura</p>
        </div>
      </div>
    </footer>
  );
}
