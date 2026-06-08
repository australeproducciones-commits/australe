import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

type ListaPreciosPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ListaPreciosPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Lista de precios: ${slug}` };
}

export default async function ListaPreciosPage({
  params,
}: ListaPreciosPageProps) {
  const { slug } = await params;

  return (
    <PlaceholderPage
      title="Lista de precios"
      description="Lista de precios del evento accesible por QR. Ideal para consulta rápida en barra, cocina o kiosco."
      backHref={ROUTES.evento(slug)}
      backLabel="Volver al evento"
      links={[
        {
          href: ROUTES.eventoEntradas(slug),
          label: "Comprar entradas",
          variant: "outline",
        },
      ]}
    />
  );
}
