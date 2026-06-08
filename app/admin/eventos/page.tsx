import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Eventos",
};

export default function AdminEventosPage() {
  return (
    <AdminPlaceholderPage
      title="Eventos"
      description="Creación y edición de eventos, flyers, fechas, capacidad y publicación."
      backHref={ROUTES.admin}
      backLabel="Volver al panel"
      links={[
        { href: ROUTES.eventos, label: "Ver sitio público", variant: "outline" },
      ]}
    />
  );
}
