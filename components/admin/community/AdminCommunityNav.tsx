"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";

const TABS = [
  { href: ROUTES.adminComunidad, label: "Resumen", match: "exact" as const },
  {
    href: ROUTES.adminComunidadPublicidad,
    label: "Publicidad",
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

export function AdminCommunityNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones de comunidad"
      className="-mx-1 overflow-x-auto px-1 pb-1"
    >
      <ul className="flex min-w-max gap-1 border-b border-white/10">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href, tab.match);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={[
                  "inline-flex items-center rounded-t-md px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-400",
                  active
                    ? "border-b-2 border-purple-400 bg-white/5 text-white"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                ].join(" ")}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
