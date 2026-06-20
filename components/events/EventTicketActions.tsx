import { EventSaleChannelPicker } from "@/components/events/EventSaleChannelPicker";
import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import {
  getValidExternalTicketUrl,
  getWhatsAppSaleUrl,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";

type EventTicketActionsProps = {
  event: Pick<
    Event,
    | "slug"
    | "name"
    | "sale_web_enabled"
    | "external_sale_enabled"
    | "sale_whatsapp_enabled"
    | "reservation_enabled"
    | "external_ticket_url"
    | "whatsapp_sale_number"
    | "whatsapp_sale_message"
    | "ticket_sale_mode"
  >;
  hasTicketTypes?: boolean;
};

export function EventTicketActions({
  event,
  hasTicketTypes = true,
}: EventTicketActionsProps) {
  return (
    <EventSaleChannelPicker event={event} hasTicketTypes={hasTicketTypes} />
  );
}

export function EventPriceListLink({ slug }: { slug: string }) {
  return (
    <Link href={ROUTES.eventoListaPrecios(slug)} className="public-link text-sm">
      Ver lista de precios →
    </Link>
  );
}

export function hasPublicSaleChannels(
  event: EventTicketActionsProps["event"],
  hasTicketTypes = true,
): boolean {
  const channels = resolveSaleChannels(event);
  const externalUrl = getValidExternalTicketUrl(event);

  return (
    (channels.saleWebEnabled && hasTicketTypes) ||
    (channels.reservationEnabled && hasTicketTypes) ||
    (channels.externalSaleEnabled && Boolean(externalUrl)) ||
    Boolean(getWhatsAppSaleUrl(event))
  );
}
