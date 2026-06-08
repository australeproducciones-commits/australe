import type { Metadata } from "next";
import { AdminPlaceholderPage } from "@/components/pages/AdminPlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Admin · Comunidad",
};

export default function AdminComunidadPage() {
  return (
    <AdminPlaceholderPage
      title="Comunidad"
      description="Gestión de miembros, descuentos y beneficios de la comunidad Australe."
      backHref={ROUTES.admin}
      backLabel="Volver al panel"
      links={[
        { href: ROUTES.comunidad, label: "Ver sitio público", variant: "outline" },
      ]}
    />
  );
}
