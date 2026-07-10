"use client";

import Link from "next/link";

type PublicErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PublicError({ error, reset }: PublicErrorProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold public-heading">No pudimos cargar esta página</h1>
      <p className="mt-3 public-text-muted">
        Intentá nuevamente en unos segundos. Si el problema continúa, volvé al inicio.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs public-text-soft">Referencia: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border px-4 py-2 text-sm public-heading"
          style={{ borderColor: "var(--public-border)" }}
        >
          Reintentar
        </button>
        <Link href="/" className="rounded-xl px-4 py-2 text-sm public-heading underline">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
