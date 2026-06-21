import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventSalesQrPriceList } from "@/components/events/EventSalesQrPriceList";
import { PublicEventKioskSection } from "@/components/kiosk/PublicEventKioskSection";
import { TicketReservationForm } from "@/components/ticket-sales/TicketReservationForm";
import {
  PageContainer,
  PublicButton,
  PublicCard,
  SectionHeading,
  StatusBadge,
} from "@/components/ui/public";
import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import {
  EVENT_STATUS,
  EVENT_STATUS_LABELS,
} from "@/lib/constants/event-status";
import { getValidExternalTicketUrl } from "@/lib/events/saleChannels";
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
    isInternalSaleEnabled(event);

  const showPriceList =
    event.qr_products_enabled &&
    event.qr_show_price_list &&
    event.status === EVENT_STATUS.PUBLISHED;

  const showSellProducts =
    event.qr_products_enabled &&
    event.qr_sell_products &&
    event.status === EVENT_STATUS.PUBLISHED;

  const hasActiveModule = showTickets || showPriceList || showSellProducts;
  const externalTicketUrl = getValidExternalTicketUrl(event);

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
  const isCommunityMember = await isActiveCommunityMember(profile?.id);
  const isLoggedIn = profile !== null;
  const sellableTicketTypes = filterTicketTypesOnSale(ticketTypes);

  return (
    <PageContainer size="sm">
      <PublicCard padding="lg" className="mb-8">
        <SectionHeading
          label="QR de ventas"
          title={event.name}
          subtitle={dateTimeLabel}
        />
        {event.location_name ? (
          <p className="mt-2 text-sm public-text-muted">{event.location_name}</p>
        ) : null}
        <div className="mt-4">
          <StatusBadge tone="neutral">
            {EVENT_STATUS_LABELS[event.status] ?? event.status}
          </StatusBadge>
        </div>
      </PublicCard>

      {!hasActiveModule ? (
        <PublicCard padding="lg" className="text-center">
          <h2 className="public-heading text-xl font-bold">
            QR de ventas no disponible
          </h2>
          <p className="mt-3 text-sm public-text-muted">
            {event.status !== EVENT_STATUS.PUBLISHED
              ? "Este evento todavía no está publicado o las opciones del QR no están activas."
              : "No hay módulos de venta habilitados para este código."}
          </p>
          {event.qr_sell_tickets && !isInternalSaleEnabled(event) ? (
            <p className="mt-3 text-sm public-text-soft">
              La venta de entradas por QR requiere venta web o reserva habilitada.
            </p>
          ) : null}
          {externalTicketUrl ? (
            <PublicButton
              href={externalTicketUrl}
              className="mt-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comprar en sitio externo
            </PublicButton>
          ) : null}
        </PublicCard>
      ) : (
        <div className="space-y-10">
          {showTickets ? (
            <section className="space-y-4">
              <SectionHeading label="Entradas" title="Reservar entradas" />

              {sellableTicketTypes.length === 0 ? (
                <PublicCard padding="lg" className="text-center">
                  <p className="text-sm public-text-muted">
                    No hay entradas disponibles en este momento.
                  </p>
                </PublicCard>
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
              <SectionHeading label="Consumiciones" title="Comprar consumiciones" />
              {publicKiosk.hasSellableProducts ? (
                <PublicEventKioskSection
                  eventId={event.id}
                  eventSlug={event.slug}
                  products={publicKiosk.products}
                  isLoggedIn={isLoggedIn}
                  isCommunityMember={isCommunityMember}
                />
              ) : (
                <PublicCard padding="lg" className="text-center">
                  <h2 className="public-heading text-lg font-bold">
                    Venta de consumiciones
                  </h2>
                  <p className="mt-2 text-sm public-text-muted">
                    No hay consumiciones disponibles para comprar por ahora.
                  </p>
                </PublicCard>
              )}
            </section>
          ) : null}
        </div>
      )}
    </PageContainer>
  );
}
