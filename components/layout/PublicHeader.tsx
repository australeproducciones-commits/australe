"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { PublicNavigationProgress } from "@/components/layout/PublicNavigationProgress";
import { PublicUserMenu } from "@/components/layout/PublicUserMenu";
import { BRAND_LOGO_ON_DARK } from "@/lib/constants/branding";
import { PUBLIC_HEADER_LINKS, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

function isNavActive(href: string, pathname: string): boolean {
  if (href === ROUTES.home) {
    return pathname === ROUTES.home;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 isolate z-50 border-b backdrop-blur-xl relative"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-header-bg)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href={ROUTES.home}
          className="relative z-10 shrink-0 rounded-lg transition hover:opacity-90"
        >
          <Image
            src={BRAND_LOGO_ON_DARK}
            alt="Australe Producciones"
            width={240}
            height={80}
            priority
            className="h-auto w-[120px] object-contain sm:w-[140px] lg:w-[150px]"
          />
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex"
          aria-label="Navegación principal"
        >
          {PUBLIC_HEADER_LINKS.map((link) => {
            const active = isNavActive(link.href, pathname);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn("public-nav-link", active && "public-nav-link--active")}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="relative z-10 ml-auto flex shrink-0 items-center justify-end gap-1">
          <div className="hidden lg:block">
            <PublicUserMenu />
          </div>
          <div className="lg:hidden">
            <PublicUserMenu compact />
          </div>
          <button
            type="button"
            className="rounded-xl border p-2.5 public-heading lg:hidden"
            style={{
              borderColor: "var(--public-border)",
              backgroundColor: "var(--public-card)",
            }}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
            <span className="mt-1 block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t px-4 py-4 lg:hidden",
          open ? "block" : "hidden",
        )}
        style={{
          borderColor: "var(--public-border)",
          backgroundColor: "var(--public-bg-section)",
        }}
      >
        <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
          {PUBLIC_HEADER_LINKS.map((link) => {
            const active = isNavActive(link.href, pathname);

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-xl px-3 py-3 text-sm font-medium transition",
                  active
                    ? "public-nav-link--active public-heading"
                    : "public-heading hover:bg-[var(--public-header-hover)]",
                )}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
          <div
            className="mt-2 border-t pt-3"
            style={{ borderColor: "var(--public-border)" }}
          >
            <PublicUserMenu stacked onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      </div>
      <Suspense fallback={null}>
        <PublicNavigationProgress />
      </Suspense>
    </header>
  );
}
