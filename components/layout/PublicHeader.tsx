import Image from "next/image";
import Link from "next/link";
import { PublicAuthNav } from "@/components/layout/PublicAuthNav";
import { ROUTES } from "@/lib/constants/routes";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href={ROUTES.home}
          className="group shrink-0 rounded-lg transition-opacity hover:opacity-90"
        >
          <Image
            src="/images/australe-logo.png"
            alt="Australe Producciones"
            width={280}
            height={110}
            priority
            className="h-auto w-[170px] object-contain md:w-[260px]"
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <PublicAuthNav />
        </nav>
      </div>
    </header>
  );
}
