"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BRAND_LOGO_ON_LIGHT } from "@/lib/constants/branding";
import { PUBLIC_NAV_LINKS, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-header-bg)",
      }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={ROUTES.home} className="shrink-0 rounded-lg transition hover:opacity-90">
          <Image
            src={BRAND_LOGO_ON_LIGHT}
            alt="Australe Producciones"
            width={240}
            height={80}
            priority
            className="h-auto w-[130px] object-contain sm:w-[160px]"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-sm font-medium transition public-text-muted hover:bg-[var(--public-header-hover)] hover:public-heading"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="rounded-xl border p-2.5 lg:hidden public-heading"
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

      <div
        className={cn("border-t px-4 py-4 lg:hidden", open ? "block" : "hidden")}
        style={{
          borderColor: "var(--public-border)",
          backgroundColor: "var(--public-bg-section)",
        }}
      >
        <nav className="flex flex-col gap-1">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-medium public-heading transition hover:bg-[var(--public-header-hover)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
