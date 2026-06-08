import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Ingresar",
};

export default function LoginPage() {
  return (
    <PlaceholderPage
      title="Ingresar"
      description="Acceso al sistema para usuarios, comunidad y personal operativo. La autenticación se implementará en una etapa posterior."
      backHref={ROUTES.home}
      backLabel="Volver al inicio"
      links={[
        { href: ROUTES.miCuenta, label: "Mi cuenta", variant: "outline" },
        { href: ROUTES.admin, label: "Panel admin" },
      ]}
    />
  );
}
