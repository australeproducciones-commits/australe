import Link from "next/link";
import { PUBLIC_NAV_LINKS, ROUTES } from "@/lib/constants/routes";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href={ROUTES.home} className="group shrink-0">
          <p className="text-lg font-bold tracking-wide text-white group-hover:text-purple-200">
            Australe
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-purple-300">
            Producciones
          </p>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white sm:px-4"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
