import Link from "next/link";
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  ROUTES,
} from "@/lib/constants/routes";

export function PublicFooter() {
  return (
    <footer
      className="mt-auto border-t"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-footer-bg)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-sm public-text-soft">
            Australe Producciones · Encuentros, cultura y comunidad
          </p>
          <p className="mt-2 text-sm public-text-muted">
            Seguinos{" "}
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="public-link font-medium"
            >
              {INSTAGRAM_HANDLE}
            </a>
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4 text-sm public-text-muted">
          <Link
            href={ROUTES.home}
            className="transition hover:text-[var(--public-primary)]"
          >
            Inicio
          </Link>
          <Link
            href={ROUTES.eventos}
            className="transition hover:text-[var(--public-primary)]"
          >
            Eventos
          </Link>
          <Link
            href={ROUTES.comunidad}
            className="transition hover:text-[var(--public-primary)]"
          >
            Comunidad
          </Link>
          <Link
            href={ROUTES.contacto}
            className="transition hover:text-[var(--public-primary)]"
          >
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}
