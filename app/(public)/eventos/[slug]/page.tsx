import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/pages/PlaceholderPage";
import { ROUTES } from "@/lib/constants/routes";

type EventoPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: EventoPageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Evento: ${slug}` };
}

export default async function EventoPage({ params }: EventoPageProps) {
  const { slug } = await params;

  return (
    <PlaceholderPage
      title={`Evento: ${slug}`}
      description="Detalle del evento con información, flyer, precios y enlaces a compra de entradas y lista de precios."
      backHref={ROUTES.eventos}
      backLabel="Volver a eventos"
      links={[
        {
          href: ROUTES.eventoEntradas(slug),
          label: "Comprar entradas",
        },
        {
          href: ROUTES.eventoListaPrecios(slug),
          label: "Lista de precios",
          variant: "outline",
        },
      ]}
    />
  );
}
