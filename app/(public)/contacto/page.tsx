import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Contacto",
};

export default function ContactoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#9B7EDE]">
        Contacto
      </p>
      <h1 className="mt-3 text-3xl font-black text-[#2F2A3A] sm:text-4xl">
        Escribinos
      </h1>
      <p className="mt-6 text-base leading-relaxed text-[#6F647C]">
        Para consultas sobre eventos, prensa o alianzas, podés acercarte a
        través de nuestras redes o la comunidad Australe.
      </p>
      <div className="public-card mt-8 rounded-3xl p-6">
        <p className="text-sm text-[#6F647C]">
          Canales de contacto próximamente. Mientras tanto, seguinos en la
          cartelera y unite a la comunidad para enterarte primero.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={ROUTES.eventos}
            className="public-btn-outline rounded-2xl px-6 py-2.5 text-sm font-semibold"
          >
            Ver eventos
          </Link>
          <Link
            href={ROUTES.comunidad}
            className="public-btn-primary rounded-2xl px-6 py-2.5 text-sm font-semibold"
          >
            Comunidad
          </Link>
        </div>
      </div>
    </div>
  );
}
