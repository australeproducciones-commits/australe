"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PublicAuthNav } from "@/components/layout/PublicAuthNav";
import { BRAND_LOGO_ON_LIGHT } from "@/lib/constants/branding";
import { PUBLIC_NAV_LINKS, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#E8DDF8] bg-[#F8F3FF]/90 backdrop-blur-xl">
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
              className="rounded-xl px-3 py-2 text-sm font-medium text-[#6F647C] transition hover:bg-[#F1E8FF] hover:text-[#2F2A3A]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <PublicAuthNav surface="light" />
          <Link
            href={ROUTES.comunidad}
            className="public-btn-primary rounded-2xl px-5 py-2.5 text-sm font-semibold transition"
          >
            Sumate a la comunidad
          </Link>
        </div>

        <button
          type="button"
          className="rounded-xl border border-[#E8DDF8] bg-white p-2.5 text-[#2F2A3A] lg:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
          <span className="mt-1 block h-0.5 w-5 bg-current" />
        </button>
      </div>

      <div
        className={cn(
          "border-t border-[#E8DDF8] bg-[#FBF7FF] px-4 py-4 lg:hidden",
          open ? "block" : "hidden",
        )}
      >
        <nav className="flex flex-col gap-1">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-medium text-[#2F2A3A] hover:bg-[#F1E8FF]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex flex-col gap-2 border-t border-[#E8DDF8] pt-4">
          <PublicAuthNav surface="light" stacked />
          <Link
            href={ROUTES.comunidad}
            onClick={() => setOpen(false)}
            className="public-btn-primary rounded-2xl px-5 py-3 text-center text-sm font-semibold"
          >
            Sumate a la comunidad
          </Link>
        </div>
      </div>
    </header>
  );
}
