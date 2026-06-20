import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import {
  getValidExternalTicketUrl,
  getWhatsAppSaleUrl,
  resolveSaleChannels,
} from "@/lib/events/saleChannels";
import { cn } from "@/lib/utils/cn";

type EventSaleChannelPickerProps = {
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
  className?: string;
  onlyChannels?: Array<ChannelAction["id"]>;
};

type ChannelAction = {
  id: "web" | "external" | "whatsapp" | "reservation";
  label: string;
  href: string;
  external?: boolean;
  variant: "primary" | "outline" | "ghost";
  description?: string;
};

export function EventSaleChannelPicker({
  event,
  hasTicketTypes = true,
  className,
  onlyChannels,
}: EventSaleChannelPickerProps) {
  const channels = resolveSaleChannels(event);
  const externalUrl = getValidExternalTicketUrl(event);
  const whatsappUrl = getWhatsAppSaleUrl(event);

  const actions: ChannelAction[] = [];

  if (channels.saleWebEnabled && hasTicketTypes) {
    actions.push({
      id: "web",
      label: "Comprar en la web",
      href: ROUTES.eventoEntradasCanal(event.slug, "web"),
      variant: "primary",
      description: "Compra directa con el sistema de Australe.",
    });
  }

  if (channels.externalSaleEnabled && externalUrl) {
    actions.push({
      id: "external",
      label: "Comprar en sitio externo",
      href: externalUrl,
      external: true,
      variant: actions.length === 0 ? "primary" : "outline",
    });
  }

  if (channels.saleWhatsappEnabled && whatsappUrl) {
    actions.push({
      id: "whatsapp",
      label: "Comprar por WhatsApp",
      href: whatsappUrl,
      external: true,
      variant: actions.length === 0 ? "primary" : "outline",
    });
  }

  if (channels.reservationEnabled && hasTicketTypes) {
    actions.push({
      id: "reservation",
      label: "Reserva desde la web",
      href: ROUTES.eventoEntradasCanal(event.slug, "reserva"),
      variant:
        channels.saleWebEnabled && hasTicketTypes ? "outline" : "primary",
      description: "Reservá ahora y confirmá el pago después.",
    });
  }

  const visibleActions = onlyChannels
    ? actions.filter((action) => onlyChannels.includes(action.id))
    : actions;

  if (visibleActions.length === 0) {
    return (
      <PublicCard padding="lg" className={cn("mt-8", className)}>
        <p className="public-muted-box">Entradas no disponibles</p>
      </PublicCard>
    );
  }

  const showHeading = visibleActions.length > 1;

  return (
    <PublicCard padding="lg" className={cn("mt-8", className)}>
      {showHeading ? (
        <div className="mb-5">
          <p className="public-label text-xs font-semibold uppercase tracking-[0.35em]">
            Entradas
          </p>
          <h2 className="public-heading mt-2 text-xl font-black sm:text-2xl">
            ¿Cómo querés obtener tu entrada?
          </h2>
          <p className="mt-2 text-sm public-text-muted">
            Elegí el canal que prefieras. Todas las opciones activas están
            disponibles para este evento.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {visibleActions.map((action) => (
          <PublicButton
            key={action.id}
            href={action.href}
            variant={action.variant}
            size="lg"
            className={cn(
              "w-full sm:w-auto sm:min-w-[220px]",
              action.id === "reservation" && "public-btn-reservation",
              action.id === "external" && "public-btn-external",
            )}
            target={action.external ? "_blank" : undefined}
            rel={action.external ? "noopener noreferrer" : undefined}
          >
            {action.label}
          </PublicButton>
        ))}
      </div>

      {visibleActions.some((action) => action.id === "reservation") ? (
        <p className="mt-4 text-xs public-text-soft">
          La reserva queda pendiente de confirmación de pago. No equivale a una
          venta confirmada hasta que el equipo la apruebe.
        </p>
      ) : null}
    </PublicCard>
  );
}

export function getEventSaleChannelActions(
  event: EventSaleChannelPickerProps["event"],
  hasTicketTypes = true,
): ChannelAction[] {
  const channels = resolveSaleChannels(event);
  const externalUrl = getValidExternalTicketUrl(event);
  const whatsappUrl = getWhatsAppSaleUrl(event);
  const actions: ChannelAction[] = [];

  if (channels.saleWebEnabled && hasTicketTypes) {
    actions.push({
      id: "web",
      label: "Comprar en la web",
      href: ROUTES.eventoEntradasCanal(event.slug, "web"),
      variant: "primary",
    });
  }

  if (channels.externalSaleEnabled && externalUrl) {
    actions.push({
      id: "external",
      label: "Comprar en sitio externo",
      href: externalUrl,
      external: true,
      variant: "outline",
    });
  }

  if (channels.saleWhatsappEnabled && whatsappUrl) {
    actions.push({
      id: "whatsapp",
      label: "Comprar por WhatsApp",
      href: whatsappUrl,
      external: true,
      variant: "outline",
    });
  }

  if (channels.reservationEnabled && hasTicketTypes) {
    actions.push({
      id: "reservation",
      label: "Reserva desde la web",
      href: ROUTES.eventoEntradasCanal(event.slug, "reserva"),
      variant: "outline",
    });
  }

  return actions;
}
