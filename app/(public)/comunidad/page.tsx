import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Comunidad",
};

export default function ComunidadPage() {
  return (
    <PlaceholderPage
      title="Comunidad Australe"
      description="Registro de miembros de la comunidad con beneficios y descuentos exclusivos en eventos seleccionados."
      backHref={ROUTES.home}
      backLabel="Volver al inicio"
      links={[
        { href: ROUTES.login, label: "Iniciar sesión", variant: "outline" },
        { href: ROUTES.eventos, label: "Ver eventos" },
      ]}
    />
  );
}
