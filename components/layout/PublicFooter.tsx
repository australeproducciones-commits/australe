import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-[#E8DDF8] bg-[#FBF7FF]">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-[#8B7A99]">
          Australe Producciones · Encuentros, cultura y comunidad
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-[#6F647C]">
          <Link href={ROUTES.eventos} className="hover:text-[#8568CC]">
            Eventos
          </Link>
          <Link href={ROUTES.comunidad} className="hover:text-[#8568CC]">
            Comunidad
          </Link>
          <Link href={ROUTES.sobre} className="hover:text-[#8568CC]">
            Sobre Australe
          </Link>
          <Link href={ROUTES.contacto} className="hover:text-[#8568CC]">
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}
