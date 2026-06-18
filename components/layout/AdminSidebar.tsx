"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV_LINKS, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type AdminSidebarProps = {
  pendingSalesCount?: number;
};

export function AdminSidebar({ pendingSalesCount = 0 }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === ROUTES.admin ? pathname === href : pathname.startsWith(href);

  const navContent = (
    <nav className="flex flex-col gap-1 p-4">
      <Link
        href={ROUTES.home}
        className="mb-4 rounded-xl px-3 py-2 text-xs uppercase tracking-[0.2em] text-zinc-500 transition hover:text-purple-300"
      >
        ← Volver al sitio
      </Link>
      {ADMIN_NAV_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          onClick={() => setOpen(false)}
          className={cn(
            "rounded-xl px-4 py-3 text-sm font-medium transition",
            isActive(link.href)
              ? "bg-purple-500/20 text-purple-200"
              : "text-zinc-400 hover:bg-white/5 hover:text-white",
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span>{link.label}</span>
            {link.href === ROUTES.adminVentas && pendingSalesCount > 0 ? (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-zinc-900">
                {pendingSalesCount}
              </span>
            ) : null}
          </span>
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-4 left-4 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500 text-white shadow-lg shadow-purple-500/30 lg:hidden"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-zinc-950 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-white/10 px-4 py-5">
          <p className="text-sm font-bold text-white">Panel Admin</p>
          <p className="text-xs text-purple-300">Australe Producciones</p>
        </div>
        {navContent}
      </aside>
    </>
  );
}
