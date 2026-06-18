"use client";

import Link from "next/link";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import { ROUTES } from "@/lib/constants/routes";
import {
  formatKioskMoney,
  getKioskPaymentStatusLabel,
  getKioskPickupStatusLabel,
} from "@/lib/kiosk/utils";
import { KIOSK_ORDER_PAYMENT_STATUS, KIOSK_ORDER_PICKUP_STATUS } from "@/lib/kiosk/types";

export type PublicKioskOrderSuccessLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type PublicKioskOrderSuccessProps = {
  title?: string;
  subtitle?: string;
  orderCode: string;
  totalAmount: number;
  lines: PublicKioskOrderSuccessLine[];
  buyerName?: string;
  buyerWhatsapp?: string | null;
  buyerDni?: string | null;
  buyerEmail?: string | null;
  eventSlug?: string;
  onMakeAnother?: () => void;
  embedded?: boolean;
  showHeader?: boolean;
  showInstructions?: boolean;
  showActions?: boolean;
};

export function PublicKioskOrderSuccess({
  title = "Consumisiones reservadas",
  subtitle,
  orderCode,
  totalAmount,
  lines,
  buyerName,
  buyerWhatsapp,
  buyerDni,
  buyerEmail,
  eventSlug,
  onMakeAnother,
  embedded = false,
  showHeader = true,
  showInstructions = true,
  showActions = true,
}: PublicKioskOrderSuccessProps) {
  const content = (
    <div className="space-y-5">
      {showHeader ? (
        <div className="flex items-start gap-3">
          <div
            className="public-success-icon h-10 w-10 shrink-0 text-lg"
            aria-hidden
          >
            ✓
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--public-fresh-foreground)]">
              Reserva registrada
            </p>
            <h2 className="public-heading mt-1 text-xl font-black sm:text-2xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 public-text-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <h3 className="public-heading text-left text-lg font-bold">{title}</h3>
      )}

      {buyerName ? (
        <div className="public-summary-box text-left text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider public-text-soft">
            Comprador
          </p>
          <p className="public-heading mt-1 font-medium">{buyerName}</p>
          {buyerWhatsapp || buyerDni || buyerEmail ? (
            <p className="mt-1 public-text-muted">
              {[buyerWhatsapp, buyerDni, buyerEmail].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="public-price-banner text-left">
        <p className="text-xs font-semibold uppercase tracking-wider public-label">
          Código de kiosco
        </p>
        <p className="public-heading mt-2 font-mono text-2xl font-bold tracking-wide">
          {orderCode}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone="warning">
            Pago: {getKioskPaymentStatusLabel(KIOSK_ORDER_PAYMENT_STATUS.PENDING)}
          </StatusBadge>
          <StatusBadge tone="warning">
            Retiro: {getKioskPickupStatusLabel(KIOSK_ORDER_PICKUP_STATUS.PENDING)}
          </StatusBadge>
        </div>
      </div>

      <div className="public-summary-box text-left text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider public-text-soft">
          Productos
        </p>
        <ul className="mt-3 space-y-2">
          {lines.map((line) => (
            <li
              key={`${line.name}-${line.quantity}`}
              className="flex justify-between gap-4 public-text-muted"
            >
              <span className="min-w-0">
                {line.name} × {line.quantity}
                <span className="mt-0.5 block text-xs public-text-soft">
                  {formatKioskMoney(line.unitPrice)} c/u
                </span>
              </span>
              <span className="public-heading shrink-0 font-medium">
                {formatKioskMoney(line.subtotal)}
              </span>
            </li>
          ))}
        </ul>
        <p className="public-heading mt-4 flex justify-between border-t pt-3 font-bold" style={{ borderColor: "var(--public-border)" }}>
          <span>Total consumisiones</span>
          <span>{formatKioskMoney(totalAmount)}</span>
        </p>
      </div>

      {showInstructions ? (
        <PublicCard padding="md" className="text-left">
          <p className="text-sm leading-6 public-text-muted">
            Las consumisiones quedan reservadas. El pago se confirma según la
            modalidad indicada por la organización.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 public-text-soft">
            <li>Guardá esta pantalla o tomá captura.</li>
            <li>Presentá el código de kiosco para retirar tus consumisiones.</li>
            <li>La organización confirmará el pago según corresponda.</li>
          </ul>
        </PublicCard>
      ) : null}

      {showActions ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          {onMakeAnother ? (
            <PublicButton type="button" onClick={onMakeAnother} className="sm:flex-1">
              Hacer otra reserva
            </PublicButton>
          ) : null}
          {eventSlug ? (
            <PublicButton
              href={ROUTES.evento(eventSlug)}
              variant="outline"
              className="sm:flex-1"
            >
              Volver al evento
            </PublicButton>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <PublicCard padding="lg" className="mt-8">
      {content}
    </PublicCard>
  );
}

export function PublicKioskPresaleLink({
  eventSlug,
  className,
}: {
  eventSlug: string;
  className?: string;
}) {
  return (
    <Link
      href={`${ROUTES.evento(eventSlug)}#preventa-consumisiones`}
      className={className ?? "public-link text-sm"}
    >
      Reservar consumisiones
    </Link>
  );
}
