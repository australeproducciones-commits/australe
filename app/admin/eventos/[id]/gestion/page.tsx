import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventManagementView } from "@/components/finance/EventManagementView";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { ROUTES } from "@/lib/constants/routes";
import { getEventManagementData } from "@/lib/finance/queries";

type AdminEventoGestionPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminEventoGestionPageProps): Promise<Metadata> {
  const { id } = await params;
  const data = isUuid(id) ? await getEventManagementData(id) : null;
  return {
    title: data
      ? `Admin · Gestión · ${data.event.name}`
      : "Admin · Gestión",
  };
}

export default async function AdminEventoGestionPage({
  params,
}: AdminEventoGestionPageProps) {
  const { id } = await params;

  if (isReservedEventAdminSegment(id) || !isUuid(id)) {
    notFound();
  }

  const data = await getEventManagementData(id);
  if (!data) {
    notFound();
  }

  return (
    <>
      <AdminHeader
        title={`Gestión · ${data.event.name}`}
        description="Ingresos, gastos y resultado económico del evento."
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap gap-3">
          <Button href={ROUTES.adminEvento(data.event.id)} variant="ghost" size="sm">
            ← Volver al evento
          </Button>
          <Button
            href={ROUTES.adminEventoVentas(data.event.id)}
            variant="outline"
            size="sm"
          >
            Ventas
          </Button>
        </div>

        <EventManagementView data={data} />
      </div>
    </>
  );
}
