"use client";

import { useActionState, useTransition } from "react";
import { lookupStorePickupOrderAction, markStoreOrderDeliveredAction } from "@/lib/store/actions";
import type { StoreOrder } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

type PickupState = {
  error?: string;
  orders: StoreOrder[];
};

export function AdminStorePickupPanel() {
  const [pending, startTransition] = useTransition();
  const [state, formAction, formPending] = useActionState(
    async (_prev: PickupState, formData: FormData): Promise<PickupState> => {
      const code = String(formData.get("code") ?? "").trim();
      const orderNumber = String(formData.get("order_number") ?? "").trim();

      const result = await lookupStorePickupOrderAction(
        code || undefined,
        orderNumber || undefined,
      );

      return {
        error: result.error,
        orders: (result.orders as StoreOrder[] | undefined) ?? [],
      };
    },
    { orders: [] },
  );

  return (
    <div className="space-y-6">
      <form action={formAction} className="flex flex-wrap gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <input
          name="code"
          placeholder="Código de retiro"
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
        />
        <input
          name="order_number"
          placeholder="Número de pedido (STO-...)"
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={formPending}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Buscar
        </button>
      </form>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <div className="space-y-4">
        {state.orders.map((order) => (
          <div key={order.id} className="rounded-xl border border-zinc-800 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{order.order_number}</p>
                <p className="text-sm text-zinc-400">{order.customer_name}</p>
                <p className="text-sm text-zinc-400">
                  {formatStorePrice(order.total)} · {order.status} · pago {order.payment_status}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await markStoreOrderDeliveredAction(order.id);
                    window.location.reload();
                  })
                }
                disabled={
                  pending ||
                  order.status === "delivered" ||
                  order.payment_status !== "confirmed"
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                Marcar entregado
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
