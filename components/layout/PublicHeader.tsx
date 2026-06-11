import Image from "next/image";
import Link from "next/link";
import { PublicAuthNav } from "@/components/layout/PublicAuthNav";
import { BRAND_LOGO_ON_DARK } from "@/lib/constants/branding";
import { ROUTES } from "@/lib/constants/routes";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href={ROUTES.home}
          className="group shrink-0 rounded-lg transition-opacity hover:opacity-90"
        >
          <Image
            src={BRAND_LOGO_ON_DARK}
            alt="Australe Producciones"
            width={280}
            height={100}
            priority
            className="h-auto w-[148px] object-contain sm:w-[190px] md:w-[220px]"
          />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          <PublicAuthNav />
        </nav>
      </div>
    </header>
  );
}
