"use client";

import { useTransition } from "react";
import {
  cancelStoreOrderAction,
  markStoreOrderDeliveredAction,
  markStoreOrderPaidAction,
  markStoreOrderReadyAction,
} from "@/lib/store/actions";
import type { StoreOrder } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

export function AdminStoreOrdersPanel({ orders }: { orders: StoreOrder[] }) {
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
            <th className="px-4 py-3">Retiro</th>
            <th className="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-t border-zinc-800 align-top">
              <td className="px-4 py-3 text-white">{order.order_number}</td>
              <td className="px-4 py-3 text-zinc-300">
                <div>{order.customer_name}</div>
                <div className="text-xs">{order.customer_email}</div>
              </td>
              <td className="px-4 py-3 text-zinc-300">{formatStorePrice(order.total)}</td>
              <td className="px-4 py-3 text-zinc-300">{order.status}</td>
              <td className="px-4 py-3 text-zinc-300">{order.payment_status}</td>
              <td className="px-4 py-3 text-zinc-300">{order.pickup_code ?? "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
