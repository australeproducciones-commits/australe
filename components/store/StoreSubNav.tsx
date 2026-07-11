"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const NAV_LINKS = [
  { href: ROUTES.tienda, label: "Inicio", match: "tienda-home" as const },
  { href: `${ROUTES.tienda}#catalogo`, label: "Productos", match: "tienda-catalog" as const },
  { href: ROUTES.eventos, label: "Eventos", match: "eventos" as const },
  { href: ROUTES.comunidad, label: "Comunidad", match: "comunidad" as const },
] as const;

function isStoreProductPath(pathname: string): boolean {
  return (
    pathname.startsWith("/tienda/") &&
    !pathname.startsWith("/tienda/carrito") &&
    !pathname.startsWith("/tienda/checkout") &&
    !pathname.startsWith("/tienda/pago")
  );
}

function isNavLinkActive(
  pathname: string,
  match: (typeof NAV_LINKS)[number]["match"],
): boolean {
  switch (match) {
    case "tienda-home":
      return pathname === ROUTES.tienda;
    case "tienda-catalog":
      return isStoreProductPath(pathname);
    case "eventos":
      return pathname.startsWith(ROUTES.eventos);
    case "comunidad":
      return pathname.startsWith(ROUTES.comunidad);
    default:
      return false;
  }
}

export function StoreSubNav() {
  const pathname = usePathname();
  const { itemCount } = useStoreCart();
  const isStoreRoute = pathname === ROUTES.tienda || pathname.startsWith("/tienda/");

  if (!isStoreRoute) {
    return null;
  }

  return (
    <>
      <div
        className="store-header-bridge"
        aria-hidden
      />
      <div
        className="sticky top-[57px] z-40 border-b backdrop-blur-xl lg:top-[65px]"
        style={{
          borderColor: "var(--public-border)",
          backgroundColor: "rgba(10, 9, 13, 0.92)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <nav
            className="flex flex-1 items-center gap-1 overflow-x-auto scrollbar-none"
            aria-label="Navegación de tienda"
          >
            {NAV_LINKS.map((link) => {
              const active = isNavLinkActive(pathname, link.match);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-[rgba(167,139,219,0.15)] text-[var(--public-primary-hover)]"
                      : "text-[var(--public-text-secondary)] hover:bg-[var(--public-header-hover)] hover:text-[var(--public-text)]",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href={ROUTES.tiendaCarrito}
            className="relative flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition hover:border-[rgba(167,139,219,0.35)]"
            style={{ borderColor: "var(--public-border)" }}
            aria-label={`Carrito${itemCount > 0 ? `, ${itemCount} productos` : ""}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              aria-hidden
            >
              <path d="M6 6h15l-1.5 9h-12z" />
              <circle cx="9" cy="20" r="1.5" />
              <circle cx="18" cy="20" r="1.5" />
              <path d="M6 6L5 3H2" />
            </svg>
            <span className="hidden sm:inline">Carrito</span>
            {itemCount > 0 ? (
              <span
                className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold"
                style={{
                  background: "var(--public-primary)",
                  color: "#0a090d",
                }}
              >
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>
    </>
  );
}
