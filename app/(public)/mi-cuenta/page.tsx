import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

export default function MiCuentaPage() {
  return (
    <PlaceholderPage
      title="Mi cuenta"
      description="Perfil del usuario con datos personales, membresía de comunidad y acceso a entradas compradas."
      backHref={ROUTES.home}
      backLabel="Volver al inicio"
      links={[
        { href: ROUTES.miCuentaEntradas, label: "Mis entradas" },
        { href: ROUTES.comunidad, label: "Comunidad", variant: "outline" },
      ]}
    />
  );
}
