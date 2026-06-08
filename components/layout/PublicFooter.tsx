import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-white/10 bg-black/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-zinc-500">
          Australe Producciones · Sistema de eventos y comunidad
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-zinc-400">
          <Link href={ROUTES.eventos} className="hover:text-purple-300">
            Eventos
          </Link>
          <Link href={ROUTES.comunidad} className="hover:text-purple-300">
            Comunidad
          </Link>
          <Link href={ROUTES.login} className="hover:text-purple-300">
            Ingresar
          </Link>
        </div>
      </div>
    </footer>
  );
}
