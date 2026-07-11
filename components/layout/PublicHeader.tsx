"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PublicUserMenu } from "@/components/layout/PublicUserMenu";
import { BRAND_LOGO_ON_LIGHT } from "@/lib/constants/branding";
import { PUBLIC_HEADER_LINKS, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

const navLinkClass =
  "relative z-10 rounded-xl px-3 py-2 text-sm font-medium transition public-text-muted hover:bg-[var(--public-header-hover)] hover:public-heading";

const COMMUNITY_TAGLINE = "Más que eventos, somos una comunidad.";

function CommunityCallout({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <p className="max-w-xs text-center text-sm font-medium leading-snug public-text-muted text-balance sm:max-w-md">
        {COMMUNITY_TAGLINE}
      </p>
      <Link
        href={ROUTES.comunidad}
        className="public-header-community-btn rounded-full px-4 py-1.5 text-sm font-semibold"
      >
        Sumate
      </Link>
    </div>
  );
}

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header
      className="sticky top-0 isolate z-50 border-b backdrop-blur-xl"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-header-bg)",
      }}
    >
      <div className="relative z-20 mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Link
            href={ROUTES.home}
            className="relative z-10 shrink-0 justify-self-start rounded-lg transition hover:opacity-90"
          >
            <Image
              src={BRAND_LOGO_ON_LIGHT}
              alt="Australe Producciones"
              width={240}
              height={80}
              priority
              className="h-auto w-[120px] object-contain sm:w-[150px] lg:w-[160px]"
            />
          </Link>

          <CommunityCallout className="hidden lg:flex lg:justify-self-center" />

          <div className="relative z-10 flex shrink-0 items-center justify-end gap-1 justify-self-end">
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
      </div>

      <div
        className="relative z-10 hidden border-t lg:block"
        style={{ borderColor: "var(--public-border)" }}
      >
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-1 px-4 py-2 sm:px-6">
          {PUBLIC_HEADER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={navLinkClass}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div
        className={cn(
          "relative z-10 border-t px-4 py-4 lg:hidden",
          open ? "block" : "hidden",
        )}
        style={{
          borderColor: "var(--public-border)",
          backgroundColor: "var(--public-bg-section)",
        }}
      >
        <div
          className="mb-4 rounded-2xl border px-4 py-4"
          style={{ borderColor: "var(--public-border)" }}
        >
          <CommunityCallout />
        </div>

        <nav className="flex flex-col gap-1">
          {PUBLIC_HEADER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-medium public-heading transition hover:bg-[var(--public-header-hover)]"
            >
              {link.label}
            </Link>
          ))}
          <div
            className="mt-2 border-t pt-3"
            style={{ borderColor: "var(--public-border)" }}
          >
            <PublicUserMenu stacked onNavigate={() => setOpen(false)} />
          </div>
        </nav>
      </div>
    </header>
  );
}
