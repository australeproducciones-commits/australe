"use client";

import { useTransition } from "react";
import { reconcileStoreOrderMercadoPagoAction } from "@/lib/payments/admin-actions";
import {
  cancelStoreOrderAction,
  markStoreOrderDeliveredAction,
  markStoreOrderPaidAction,
  markStoreOrderReadyAction,
} from "@/lib/store/actions";
import type { StoreOrderWithPayments } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

function maskId(value: string | null | undefined): string {
  if (!value) return "—";
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export function AdminStoreOrdersPanel({ orders }: { orders: StoreOrderWithPayments[] }) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      window.location.reload();
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900 text-left text-zinc-400">
          <tr>
            <th className="px-4 py-3">Pedido</th>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Pago</th>
            <th className="px-4 py-3">MP / Conciliación</th>
            <th className="px-4 py-3">Retiro</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const latestTx = order.payment_transactions[0];
            const needsReview =
              order.status === "payment_review" || order.payment_status === "review";

            return (
              <tr key={order.id} className="border-t border-zinc-800 align-top">
                <td className="px-4 py-3 text-white">{order.order_number}</td>
                <td className="px-4 py-3 text-zinc-300">
                  <div>{order.customer_name}</div>
                  <div className="text-xs">{order.customer_email}</div>
                </td>
                <td className="px-4 py-3 text-zinc-300">{formatStorePrice(order.total)}</td>
                <td className="px-4 py-3 text-zinc-300">
                  {order.status}
                  {needsReview ? (
                    <span className="ml-2 rounded bg-amber-900 px-1.5 py-0.5 text-xs text-amber-200">
                      revisión
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-300">
                  <div>{order.payment_status}</div>
                  <div className="text-xs">{order.payment_provider ?? "—"}</div>
                  {order.paid_at ? (
                    <div className="text-xs text-zinc-500">
                      {new Date(order.paid_at).toLocaleString("es-AR")}
                    </div>
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
                    {order.payment_status !== "confirmed" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => markStoreOrderPaidAction(order.id))}
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
  );
}
