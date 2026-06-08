import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Eventos",
};

export default function EventosPage() {
  return (
    <PlaceholderPage
      title="Eventos"
      description="Listado público de eventos de Australe Producciones. Acá vas a ver flyers, fechas, lugares y acceso a entradas."
      backHref={ROUTES.home}
      backLabel="Volver al inicio"
      links={[
        { href: ROUTES.evento("noche-australe"), label: "Ver evento de ejemplo" },
        { href: ROUTES.comunidad, label: "Comunidad", variant: "outline" },
      ]}
    />
  );
}
