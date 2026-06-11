import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminEventKioskPanel } from "@/components/kiosk/AdminEventKioskPanel";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/lib/constants/routes";
import { isReservedEventAdminSegment, isUuid } from "@/lib/events/adminRoutes";
import { getEventByIdForAdmin } from "@/lib/events/queries";
import { formatEventDateTime } from "@/lib/events/utils";
import {
  getEventKioskOrders,
  getEventKioskProducts,
  getEventKioskSettings,
  getKioskOrderItemsByEventId,
  getKioskProducts,
} from "@/lib/kiosk/queries";
import { getGoogleMapsSearchUrl } from "@/lib/utils/googleMaps";

type AdminEventoKioscoPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: AdminEventoKioscoPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = isUuid(id) ? await getEventByIdForAdmin(id) : null;
  return {
    title: event
      ? `Admin · Kiosco · ${event.name}`
      : "Admin · Kiosco / Consumisiones",
  };
}

export default async function AdminEventoKioscoPage({
  params,
}: AdminEventoKioscoPageProps) {
  const { id } = await params;

  if (isReservedEventAdminSegment(id) || !isUuid(id)) {
    notFound();
  }

  const event = await getEventByIdForAdmin(id);

  if (!event) {
    notFound();
  }

  const [settings, products, eventProducts, orders, orderItems] =
    await Promise.all([
      getEventKioskSettings(event.id),
      getKioskProducts(),
      getEventKioskProducts(event.id),
      getEventKioskOrders(event.id),
      getKioskOrderItemsByEventId(event.id),
    ]);

  const eventDateLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );

  return (
    <>
      <AdminHeader
        title={`Kiosco / Consumisiones · ${event.name}`}
        description="Productos, stock, preventa y ventas de consumisiones para este evento."
      />

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
        <div className="flex flex-wrap gap-3">
          <Button href={ROUTES.adminEvento(event.id)} variant="ghost" size="sm">
            ← Volver al evento
          </Button>
          <Button
            href={ROUTES.adminEventoEntradas(event.id)}
            variant="outline"
            size="sm"
          >
            Tipos de entradas
          </Button>
          <Button
            href={ROUTES.adminEventoVentas(event.id)}
            variant="outline"
            size="sm"
          >
            Ventas / reservas
          </Button>
          <Button href={ROUTES.adminEventos} variant="outline" size="sm">
            Listado de eventos
          </Button>
        </div>

        <Card padding="sm" className="space-y-1">
          <p className="text-sm font-semibold text-white">{event.name}</p>
          <p className="text-xs text-zinc-400">{eventDateLabel}</p>
          {event.location_name ? (
            <p className="text-xs text-zinc-500">{event.location_name}</p>
          ) : null}
          {event.address ? (
            <p className="text-xs text-zinc-500">
              <a
                href={getGoogleMapsSearchUrl(event.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-300 underline-offset-2 hover:underline"
              >
                {event.address}
              </a>
            </p>
          ) : null}
        </Card>

        <AdminEventKioskPanel
          event={event}
          settings={settings}
          products={products}
          eventProducts={eventProducts}
          orders={orders}
          orderItems={orderItems}
        />
      </div>
    </>
  );
}
