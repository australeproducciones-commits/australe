import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Sobre Australe",
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#9B7EDE]">
        Nosotros
      </p>
      <h1 className="mt-3 text-3xl font-black text-[#2F2A3A] sm:text-4xl">
        Sobre Australe Producciones
      </h1>
      <p className="mt-6 text-base leading-relaxed text-[#6F647C]">
        Somos una productora que organiza experiencias culturales, eventos y
        espacios de encuentro. Creemos en la cultura como forma de conectar
        personas, compartir momentos y construir comunidad.
      </p>
      <p className="mt-4 text-base leading-relaxed text-[#6F647C]">
        A través de nuestra cartelera, la comunidad Australe y experiencias
        pensadas con cuidado, buscamos que cada evento sea accesible, cálido y
        memorable.
      </p>
      <Link
        href={ROUTES.comunidad}
        className="public-btn-primary mt-10 inline-flex rounded-2xl px-8 py-3 text-sm font-semibold"
      >
        Conocer la comunidad
      </Link>
    </div>
  );
}
