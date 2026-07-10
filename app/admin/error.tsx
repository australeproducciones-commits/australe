"use client";

import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  return (
    <div className="px-4 py-16 text-center sm:px-8">
      <h1 className="text-2xl font-bold text-white">Error al cargar el panel</h1>
      <p className="mt-3 text-zinc-400">
        Podés reintentar o volver al listado de eventos.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-zinc-500">Referencia: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-white"
        >
          Reintentar
        </button>
        <Link
          href={ROUTES.adminEventos}
          className="rounded-lg px-4 py-2 text-sm text-amber-400 underline"
        >
          Ir a eventos
        </Link>
      </div>
    </div>
  );
}
