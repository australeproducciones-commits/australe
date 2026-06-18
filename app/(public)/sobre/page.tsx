import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { PageContainer } from "@/components/ui/public/PageContainer";
import { SectionHeading } from "@/components/ui/public/SectionHeading";

export const metadata: Metadata = {
  title: "Sobre Australe",
};

export default function SobrePage() {
  return (
    <PageContainer size="sm" className="sm:py-20">
      <SectionHeading label="Nosotros" title="Sobre Australe Producciones" />
      <p className="mt-6 text-base leading-relaxed public-text-muted">
        Somos una productora que organiza experiencias culturales, eventos y
        espacios de encuentro. Creemos en la cultura como forma de conectar
        personas, compartir momentos y construir comunidad.
      </p>
      <p className="mt-4 text-base leading-relaxed public-text-muted">
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
    </PageContainer>
  );
}
