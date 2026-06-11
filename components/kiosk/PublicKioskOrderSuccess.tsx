"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-medium text-amber-200">
      {children}
    </span>
  );
}

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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-lg text-emerald-300"
            aria-hidden
          >
            ✓
          </div>
          <div className="min-w-0 text-left">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
              Reserva registrada
            </p>
            <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-zinc-400">{subtitle}</p>
            ) : null}
          </div>
        </div>
      ) : (
        <h3 className="text-left text-lg font-bold text-white">{title}</h3>
      )}

      {buyerName ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Comprador
          </p>
          <p className="mt-1 font-medium text-white">{buyerName}</p>
          {buyerWhatsapp || buyerDni || buyerEmail ? (
            <p className="mt-1 text-zinc-400">
              {[buyerWhatsapp, buyerDni, buyerEmail].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-purple-400/20 bg-purple-400/10 p-4 text-left">
        <p className="text-xs font-semibold uppercase tracking-wider text-purple-200">
          Código de kiosco
        </p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-wide text-white">
          {orderCode}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge>
            Pago: {getKioskPaymentStatusLabel(KIOSK_ORDER_PAYMENT_STATUS.PENDING)}
          </StatusBadge>
          <StatusBadge>
            Retiro: {getKioskPickupStatusLabel(KIOSK_ORDER_PICKUP_STATUS.PENDING)}
          </StatusBadge>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Productos
        </p>
        <ul className="mt-3 space-y-2">
          {lines.map((line) => (
            <li
              key={`${line.name}-${line.quantity}`}
              className="flex justify-between gap-4 text-zinc-300"
            >
              <span className="min-w-0">
                {line.name} × {line.quantity}
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {formatKioskMoney(line.unitPrice)} c/u
                </span>
              </span>
              <span className="shrink-0 font-medium text-white">
                {formatKioskMoney(line.subtotal)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t border-white/10 pt-3 font-bold text-white">
          <span>Total consumisiones</span>
          <span>{formatKioskMoney(totalAmount)}</span>
        </p>
      </div>

      {showInstructions ? (
        <Card padding="md" className="border-white/10 bg-white/[0.02] text-left">
          <p className="text-sm leading-6 text-zinc-300">
            Las consumisiones quedan reservadas. El pago se confirma según la
            modalidad indicada por la organización.
          </p>
          <ul className="mt-3 space-y-1.5 text-xs leading-5 text-zinc-500">
            <li>Guardá esta pantalla o tomá captura.</li>
            <li>Presentá el código de kiosco para retirar tus consumisiones.</li>
            <li>La organización confirmará el pago según corresponda.</li>
          </ul>
        </Card>
      ) : null}

      {showActions ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          {onMakeAnother ? (
            <Button type="button" onClick={onMakeAnother} className="sm:flex-1">
              Hacer otra reserva
            </Button>
          ) : null}
          {eventSlug ? (
            <Button
              href={ROUTES.evento(eventSlug)}
              variant="outline"
              className="sm:flex-1"
            >
              Volver al evento
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card padding="lg" className="mt-8">
      {content}
    </Card>
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
      className={className}
    >
      Reservar consumisiones
    </Link>
  );
}
