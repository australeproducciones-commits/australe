"use client";

import { useMemo, useState, useTransition } from "react";
import { ConfirmManualPaymentModal } from "@/components/store/admin/ConfirmManualPaymentModal";
import { reconcileStoreOrderMercadoPagoAction } from "@/lib/payments/admin-actions";
import {
  cancelStoreOrderAction,
  markStoreOrderDeliveredAction,
  markStoreOrderReadyAction,
} from "@/lib/store/actions";
import {
  STORE_MANUAL_PAYMENT_METHOD_LABELS,
  STORE_PAYMENT_CHANNEL_LABELS,
} from "@/lib/store/payment-channels";
import type { StoreOrderWithPayments } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

type OrderFilter =
  | "all"
  | "pending_payment"
  | "mercadopago"
  | "manual"
  | "review"
  | "paid"
  | "expired"
  | "ready"
  | "delivered"
  | "cancelled";

function maskId(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

function matchesFilter(order: StoreOrderWithPayments, filter: OrderFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "pending_payment":
      return order.payment_status === "pending" && ["pending", "reserved"].includes(order.status);
    case "mercadopago":
      return order.payment_channel === "mercadopago";
    case "manual":
      return order.payment_channel === "manual";
    case "review":
      return order.status === "payment_review" || order.payment_status === "review";
    case "paid":
      return order.payment_status === "confirmed" || order.status === "paid";
    case "expired":
      return order.status === "expired";
    case "ready":
      return order.status === "ready";
    case "delivered":
      return order.status === "delivered";
    case "cancelled":
      return order.status === "cancelled";
    default:
      return true;
  }
}

const FILTER_OPTIONS: { id: OrderFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "pending_payment", label: "Pendiente de pago" },
  { id: "mercadopago", label: "Mercado Pago" },
  { id: "manual", label: "Pago manual" },
  { id: "review", label: "En revisión" },
  { id: "paid", label: "Pagada" },
  { id: "expired", label: "Expirada" },
  { id: "ready", label: "Lista" },
  { id: "delivered", label: "Entregada" },
  { id: "cancelled", label: "Cancelada" },
];

export function AdminStoreOrdersPanel({ orders }: { orders: StoreOrderWithPayments[] }) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [confirmOrder, setConfirmOrder] = useState<StoreOrderWithPayments | null>(null);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter)),
    [orders, filter],
  );

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      window.location.reload();
    });
  }

  function canConfirmManual(order: StoreOrderWithPayments): boolean {
    if (order.payment_status === "confirmed") {
      return false;
    }
    if (order.status === "payment_review" || order.payment_status === "review") {
      return true;
    }
    if (order.payment_channel === "mercadopago" && order.payment_status === "pending") {
      return false;
    }
    if (["cancelled", "expired", "delivered", "refunded"].includes(order.status)) {
      return false;
    }
    return order.payment_status === "pending";
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === option.id
                ? "bg-white text-zinc-900"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-900 text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">MP / Conciliación</th>
              <th className="px-4 py-3">Retiro</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => {
              const latestTx = order.payment_transactions[0];
              const needsReview =
                order.status === "payment_review" || order.payment_status === "review";
              const methodLabel =
                order.payment_method &&
                order.payment_method in STORE_MANUAL_PAYMENT_METHOD_LABELS
                  ? STORE_MANUAL_PAYMENT_METHOD_LABELS[
                      order.payment_method as keyof typeof STORE_MANUAL_PAYMENT_METHOD_LABELS
                    ]
                  : order.payment_method;

              return (
                <tr key={order.id} className="border-t border-zinc-800 align-top">
                  <td className="px-4 py-3 text-white">{order.order_number}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    <div>{order.customer_name}</div>
                    <div className="text-xs">{order.customer_email}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{formatStorePrice(order.total)}</td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">
                    {order.payment_channel
                      ? STORE_PAYMENT_CHANNEL_LABELS[
                          order.payment_channel as keyof typeof STORE_PAYMENT_CHANNEL_LABELS
                        ] ?? order.payment_channel
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    {order.status}
                    {needsReview ? (
                      <span className="ml-2 rounded bg-amber-900 px-1.5 py-0.5 text-xs text-amber-200">
                        revisión
                      </span>
                    ) : null}
                    {order.payment_review_reason ? (
                      <div className="mt-1 text-xs text-amber-300">
                        {order.payment_review_reason}
                      </div>
                    ) : null}
                    {order.reserved_until && order.payment_status === "pending" ? (
                      <div className="mt-1 text-xs text-zinc-500">
                        Vence {new Date(order.reserved_until).toLocaleString("es-AR")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-300">
                    <div>{order.payment_status}</div>
                    <div className="text-xs">{methodLabel ?? order.payment_provider ?? "—"}</div>
                    {order.paid_at ? (
                      <div className="text-xs text-zinc-500">
                        {new Date(order.paid_at).toLocaleString("es-AR")}
                      </div>
                    ) : null}
                    {order.payment_reference ? (
                      <div className="text-xs text-zinc-500">Ref: {order.payment_reference}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-300 text-xs">
                    <div>Pref: {maskId(latestTx?.provider_preference_id ?? order.payment_reference)}</div>
                    <div>Pay: {maskId(latestTx?.provider_payment_id)}</div>
                    <div>MP: {latestTx?.status ?? "—"}</div>
                    {latestTx?.status_detail ? (
                      <div className="text-zinc-500">{latestTx.status_detail}</div>
                    ) : null}
                    {latestTx && Number(latestTx.amount) !== Number(order.total) ? (
                      <div className="text-amber-400">Diferencia de importe</div>
                    ) : null}
                    <div className="text-zinc-500">Webhooks: {order.webhook_attempts}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300">{order.pickup_code ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {order.payment_provider === "mercadopago" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() =>
                            run(() => reconcileStoreOrderMercadoPagoAction(order.id))
                          }
                          className="rounded bg-sky-800 px-2 py-1 text-xs text-white"
                        >
                          Reconciliar MP
                        </button>
                      ) : null}
                      {canConfirmManual(order) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setConfirmOrder(order)}
                          className="rounded bg-emerald-700 px-2 py-1 text-xs text-white"
                        >
                          Confirmar pago
                        </button>
                      ) : null}
                      {order.status === "paid" ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => markStoreOrderReadyAction(order.id))}
                          className="rounded bg-blue-700 px-2 py-1 text-xs text-white"
                        >
                          Listo
                        </button>
                      ) : null}
                      {["paid", "ready", "preparing"].includes(order.status) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => markStoreOrderDeliveredAction(order.id))}
                          className="rounded bg-violet-700 px-2 py-1 text-xs text-white"
                        >
                          Entregar
                        </button>
                      ) : null}
                      {!["cancelled", "delivered", "expired"].includes(order.status) ? (
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => run(() => cancelStoreOrderAction(order.id))}
                          className="rounded bg-zinc-700 px-2 py-1 text-xs text-white"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {confirmOrder ? (
        <ConfirmManualPaymentModal
          order={confirmOrder}
          onClose={() => setConfirmOrder(null)}
          onConfirmed={() => {
            setConfirmOrder(null);
            window.location.reload();
          }}
        />
      ) : null}
    </>
  );
}
