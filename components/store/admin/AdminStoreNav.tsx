import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: ROUTES.adminTienda, label: "Resumen", exact: true },
  { href: ROUTES.adminTiendaProductos, label: "Productos" },
  { href: ROUTES.adminTiendaPedidos, label: "Pedidos" },
  { href: ROUTES.adminTiendaStock, label: "Stock" },
  { href: ROUTES.adminTiendaRetiros, label: "Retiros" },
  { href: ROUTES.adminTiendaColecciones, label: "Colecciones" },
];

type AdminStoreNavProps = {
  currentPath: string;
};

export function AdminStoreNav({ currentPath }: AdminStoreNavProps) {
  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
      {LINKS.map((link) => {
        const active =
          link.exact
            ? currentPath === link.href
            : currentPath.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
