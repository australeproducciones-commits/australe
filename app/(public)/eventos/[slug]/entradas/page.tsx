import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

type EntradasPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EntradasPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Entradas: ${slug}` };
}

export default async function EntradasPage({ params }: EntradasPageProps) {
  const { slug } = await params;

  return (
    <PlaceholderPage
      title="Comprar entradas"
      description="Flujo de compra de entradas con QR único por ticket. Mercado Pago se integrará en una segunda etapa."
      backHref={ROUTES.evento(slug)}
      backLabel="Volver al evento"
      links={[
        { href: ROUTES.login, label: "Iniciar sesión", variant: "outline" },
        { href: ROUTES.miCuentaEntradas, label: "Mis entradas" },
      ]}
    />
  );
}
