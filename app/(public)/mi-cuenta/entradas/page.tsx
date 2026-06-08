import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

export const metadata: Metadata = {
  title: "Mis entradas",
};

export default function MisEntradasPage() {
  return (
    <PlaceholderPage
      title="Mis entradas"
      description="Listado de entradas compradas con QR único para validación en puerta."
      backHref={ROUTES.miCuenta}
      backLabel="Volver a mi cuenta"
      links={[
        { href: ROUTES.eventos, label: "Ver eventos", variant: "outline" },
      ]}
    />
  );
}
