"use client";

import { useState, useTransition } from "react";
import { confirmStoreManualPaymentAction } from "@/lib/store/actions";
import {
  STORE_MANUAL_PAYMENT_METHOD,
  STORE_MANUAL_PAYMENT_METHOD_LABELS,
  type StoreManualPaymentMethod,
} from "@/lib/store/payment-channels";
import type { StoreOrderWithPayments } from "@/lib/store/types";
import { formatStorePrice } from "@/lib/store/utils";

export function ConfirmManualPaymentModal({
  order,
  onClose,
  onConfirmed,
}: {
  order: StoreOrderWithPayments;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<StoreManualPaymentMethod>(
    STORE_MANUAL_PAYMENT_METHOD.CASH,
  );
  const [amount, setAmount] = useState(String(order.total));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount.replace(",", "."));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Ingresá un importe válido.");
      return;
    }

    startTransition(async () => {
      const result = await confirmStoreManualPaymentAction({
        orderId: order.id,
        paymentMethod: method,
        amountReceived: parsedAmount,
        paymentReference: reference || undefined,
        notes: notes || undefined,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo confirmar el pago.");
        return;
      }

      onConfirmed();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-payment-title"
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-6 shadow-xl"
      >
        <h2 id="confirm-payment-title" className="text-lg font-bold text-white">
          Confirmar pago
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Pedido {order.order_number} · {order.customer_name}
        </p>

        <dl className="mt-4 space-y-2 text-sm text-zinc-300">
          <div className="flex justify-between">
            <dt>Total esperado</dt>
            <dd className="font-semibold text-white">{formatStorePrice(order.total)}</dd>
          </div>
          {order.reserved_until ? (
            <div className="flex justify-between">
              <dt>Vencimiento reserva</dt>
              <dd>{new Date(order.reserved_until).toLocaleString("es-AR")}</dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-zinc-300" htmlFor="payment-method">
              Método de pago
            </label>
            <select
              id="payment-method"
              required
              value={method}
              onChange={(e) => setMethod(e.target.value as StoreManualPaymentMethod)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            >
              {Object.entries(STORE_MANUAL_PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300" htmlFor="amount-received">
              Importe recibido
            </label>
            <input
              id="amount-received"
              required
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300" htmlFor="payment-reference">
              Referencia (opcional)
            </label>
            <input
              id="payment-reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
              placeholder="Nº operación, comprobante..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300" htmlFor="payment-notes">
              Observación (opcional)
            </label>
            <textarea
              id="payment-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white"
            />
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-zinc-600 px-4 py-2 text-sm text-zinc-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
          >
            {pending ? "Confirmando..." : "Confirmar pago"}
          </button>
        </div>
      </form>
    </div>
  );
}
