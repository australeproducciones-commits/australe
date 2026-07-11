"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const TABS = [
  {
    href: ROUTES.adminConfiguracion,
    label: "Sitio",
    match: "exact" as const,
  },
  {
    href: ROUTES.adminConfiguracionTiendaHero,
    label: "Tienda · Hero",
    match: "prefix" as const,
  },
];

function isActive(
  pathname: string,
  href: string,
  match: "exact" | "prefix",
): boolean {
  if (match === "exact") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminConfigNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones de configuración" className="-mx-1 overflow-x-auto px-1 pb-0">
      <ul className="flex min-w-max gap-1">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href, tab.match);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  "relative inline-flex items-center rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400",
                  active
                    ? "bg-zinc-900/80 text-white shadow-[inset_0_-2px_0_0_#a78bfa]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                )}
                aria-current={active ? "page" : undefined}
              >
                {active ? (
                  <span
                    className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/70 to-transparent"
                    aria-hidden
                  />
                ) : null}
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="h-px bg-white/10" aria-hidden />
    </nav>
  );
}
