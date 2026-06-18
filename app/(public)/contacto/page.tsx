import type { Metadata } from "next";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import { PageContainer } from "@/components/ui/public/PageContainer";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { SectionHeading } from "@/components/ui/public/SectionHeading";

export const metadata: Metadata = {
  title: "Contacto",
};

export default function ContactoPage() {
  return (
    <PageContainer size="sm">
      <SectionHeading
        label="Contacto"
        title="Escribinos"
        subtitle="Para consultas sobre eventos, prensa o alianzas, podés acercarte a través de nuestras redes o la comunidad Australe."
      />
      <PublicCard padding="lg" className="mt-8">
        <p className="text-sm public-text-muted">
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
      </PublicCard>
    </PageContainer>
  );
}
