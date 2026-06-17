import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventSalesQrPriceList } from "@/components/events/EventSalesQrPriceList";
import { PublicEventKioskSection } from "@/components/kiosk/PublicEventKioskSection";
import { TicketReservationForm } from "@/components/ticket-sales/TicketReservationForm";
import { Card } from "@/components/ui/Card";
import { getProfile } from "@/lib/auth/getProfile";
import {
  EVENT_STATUS,
  EVENT_STATUS_LABELS,
  TICKET_SALE_MODE,
} from "@/lib/constants/event-status";
import { getEventBySalesQrCode } from "@/lib/events/queries";
import { formatEventDateTime } from "@/lib/events/utils";
import {
  getEventKioskCatalogForQr,
  getPublicEventKiosk,
} from "@/lib/kiosk/queries";
import {
  filterTicketTypesOnSale,
  isInternalSaleEnabled,
} from "@/lib/ticket-sales/utils";
import { getActiveTicketTypesForPublishedEvent } from "@/lib/tickets/queries";
import { createClient } from "@/lib/supabase/server";

type VentaEventoPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: VentaEventoPageProps): Promise<Metadata> {
  const { code } = await params;
  const event = await getEventBySalesQrCode(code);
  return {
    title: event ? `Venta · ${event.name}` : "QR de ventas",
  };
}

export default async function VentaEventoPage({ params }: VentaEventoPageProps) {
  const { code } = await params;
  const event = await getEventBySalesQrCode(code);

  if (!event) {
    notFound();
  }

  const dateTimeLabel = formatEventDateTime(
    event.event_date,
    event.start_time,
    event.end_time,
  );

  const showTickets =
    event.qr_sell_tickets &&
    event.status === EVENT_STATUS.PUBLISHED &&
    isInternalSaleEnabled(event.ticket_sale_mode);

  const showPriceList =
    event.qr_products_enabled &&
    event.qr_show_price_list &&
    event.status === EVENT_STATUS.PUBLISHED;

  const showSellProducts =
    event.qr_products_enabled &&
    event.qr_sell_products &&
    event.status === EVENT_STATUS.PUBLISHED;

  const hasActiveModule = showTickets || showPriceList || showSellProducts;

  const [supabase, ticketTypes, catalogProducts, publicKiosk] =
    await Promise.all([
      createClient(),
      showTickets
        ? getActiveTicketTypesForPublishedEvent(event.id, event.status)
        : Promise.resolve([]),
      showPriceList
        ? getEventKioskCatalogForQr(event.id)
        : Promise.resolve([]),
      showSellProducts
        ? getPublicEventKiosk(event.id)
        : Promise.resolve({
            settings: null,
            products: [],
            presaleEnabled: false,
            hasListedProducts: false,
            hasSellableProducts: false,
          }),
    ]);

  const profile = await getProfile(supabase);
  const sellableTicketTypes = filterTicketTypesOnSale(ticketTypes);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <Card padding="lg" className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-300">
          QR de ventas
        </p>
        <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">
          {event.name}
        </h1>
        <p className="mt-3 text-purple-200">{dateTimeLabel}</p>
        {event.location_name ? (
          <p className="mt-2 text-sm text-zinc-400">{event.location_name}</p>
        ) : null}
        <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          {EVENT_STATUS_LABELS[event.status] ?? event.status}
        </p>
      </Card>

      {!hasActiveModule ? (
        <Card padding="lg" className="text-center">
          <h2 className="text-xl font-bold text-white">
            QR de ventas no disponible
          </h2>
          <p className="mt-3 text-sm text-zinc-400">
            {event.status !== EVENT_STATUS.PUBLISHED
              ? "Este evento todavía no está publicado o las opciones del QR no están activas."
              : "No hay módulos de venta habilitados para este código."}
          </p>
          {event.qr_sell_tickets &&
          !isInternalSaleEnabled(event.ticket_sale_mode) ? (
            <p className="mt-3 text-sm text-zinc-500">
              La venta de entradas por QR requiere venta interna habilitada.
            </p>
          ) : null}
          {event.ticket_sale_mode === TICKET_SALE_MODE.EXTERNAL &&
          event.external_ticket_url ? (
            <a
              href={event.external_ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex rounded-2xl bg-purple-500 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-400"
            >
              Comprar entradas externas
            </a>
          ) : null}
        </Card>
      ) : (
        <div className="space-y-10">
          {showTickets ? (
            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-300">
                  Entradas
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Reservar entradas
                </h2>
              </div>

              {sellableTicketTypes.length === 0 ? (
                <Card padding="lg" className="text-center">
                  <p className="text-sm text-zinc-400">
                    No hay entradas disponibles en este momento.
                  </p>
                </Card>
              ) : (
                <TicketReservationForm
                  event={event}
                  ticketTypes={sellableTicketTypes}
                  kioskProducts={[]}
                  isLoggedIn={profile !== null}
                  defaultBuyerName={profile?.full_name ?? ""}
                />
              )}
            </section>
          ) : null}

          {showPriceList ? (
            <EventSalesQrPriceList products={catalogProducts} />
          ) : null}

          {showSellProducts ? (
            <section className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-purple-300">
                  Consumiciones
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Comprar consumiciones
                </h2>
              </div>
              {publicKiosk.hasSellableProducts ? (
                <PublicEventKioskSection
                  eventId={event.id}
                  eventSlug={event.slug}
                  products={publicKiosk.products}
                />
              ) : (
                <Card padding="lg" className="text-center">
                  <h2 className="text-lg font-bold text-white">
                    Venta de consumiciones
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    No hay consumiciones disponibles para comprar por ahora.
                  </p>
                </Card>
              )}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
