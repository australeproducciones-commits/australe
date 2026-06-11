"use client";

import { Modal } from "@/components/ui/Modal";
import { KioskOrderActions } from "@/components/kiosk/KioskOrderActions";
import type { KioskOrder, KioskOrderItem } from "@/lib/kiosk/types";
import {
  formatKioskMoney,
  getKioskOrderSourceLabel,
  getKioskPaymentStatusLabel,
  getKioskPickupStatusLabel,
  isKioskOrderCancelled,
  isKioskOrderDelivered,
} from "@/lib/kiosk/utils";
import { cn } from "@/lib/utils/cn";

type KioskOrderDetailModalProps = {
  order: KioskOrder | null;
  items: KioskOrderItem[];
  eventId: string;
  onClose: () => void;
  onCancel: (order: KioskOrder) => void;
};

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function KioskOrderDetailModal({
  order,
  items,
  eventId,
  onClose,
  onCancel,
}: KioskOrderDetailModalProps) {
  if (!order) {
    return null;
  }

  const orderItems = items.filter((item) => item.order_id === order.id);

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={`Orden ${order.order_code}`}
      className="max-w-lg"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge
            label={getKioskPaymentStatusLabel(order.payment_status)}
            tone={
              order.payment_status === "paid"
                ? "emerald"
                : order.payment_status === "pending"
                  ? "amber"
                  : "neutral"
            }
          />
          <StatusBadge
            label={getKioskPickupStatusLabel(order.pickup_status)}
            tone={
              order.pickup_status === "delivered"
                ? "emerald"
                : order.pickup_status === "ready"
                  ? "sky"
                  : "neutral"
            }
          />
          {isKioskOrderCancelled(order) ? (
            <StatusBadge label="Cancelada" tone="neutral" />
          ) : null}
          {isKioskOrderDelivered(order) ? (
            <StatusBadge label="Entregada" tone="emerald" />
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Detail label="Comprador" value={order.buyer_name} />
          <Detail label="Total" value={formatKioskMoney(order.total_amount)} />
          <Detail label="WhatsApp" value={order.buyer_whatsapp} />
          <Detail label="DNI" value={order.buyer_dni} />
          <Detail label="Email" value={order.buyer_email} />
          <Detail label="Origen" value={getKioskOrderSourceLabel(order.source)} />
          <Detail label="Pagado" value={formatDateTime(order.paid_at)} />
          <Detail label="Entregado" value={formatDateTime(order.delivered_at)} />
        </div>

        {order.ticket_id ? (
          <div className="rounded-xl bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">
              Entrada vinculada
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-sky-200">
              {order.ticket_id}
            </p>
          </div>
        ) : null}

        {order.notes ? (
          <p className="text-sm text-zinc-400">
            <span className="text-zinc-500">Notas: </span>
            {order.notes}
          </p>
        ) : null}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            Ítems
          </p>
          {orderItems.length === 0 ? (
            <p className="text-sm text-zinc-500">Sin ítems cargados.</p>
          ) : (
            <ul className="space-y-2">
              {orderItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-white">{item.product_name}</p>
                    <p className="text-xs text-zinc-500">
                      {item.quantity} × {formatKioskMoney(item.unit_price)}
                    </p>
                  </div>
                  <span className="font-semibold text-purple-200">
                    {formatKioskMoney(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <KioskOrderActions
          order={order}
          eventId={eventId}
          onCancel={() => onCancel(order)}
        />
      </div>
    </Modal>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "amber" | "sky" | "neutral";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium",
        tone === "emerald" && "bg-emerald-400/15 text-emerald-300",
        tone === "amber" && "bg-amber-400/15 text-amber-200",
        tone === "sky" && "bg-sky-400/15 text-sky-200",
        tone === "neutral" && "bg-white/10 text-zinc-400",
      )}
    >
      {label}
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-200">{value?.trim() ? value : "—"}</p>
    </div>
  );
}
