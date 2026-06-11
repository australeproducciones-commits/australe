"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { createManualKioskOrderAction } from "@/lib/kiosk/actions";
import type { EventKioskProductWithCatalog } from "@/lib/kiosk/types";
import {
  formatKioskMoney,
  formatKioskStockRemaining,
  getKioskStockAvailable,
} from "@/lib/kiosk/utils";
import {
  adminInputClassName,
  adminSelectClassName,
} from "@/lib/utils/adminFormStyles";

type CreateKioskManualOrderModalProps = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  sellableProducts: EventKioskProductWithCatalog[];
};

export function CreateKioskManualOrderModal({
  open,
  onClose,
  eventId,
  sellableProducts,
}: CreateKioskManualOrderModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerDni, setBuyerDni] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("paid");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const lines = useMemo(() => {
    return sellableProducts
      .map((product) => {
        const quantity = quantities[product.id] ?? 0;
        if (quantity <= 0) {
          return null;
        }

        return {
          product,
          quantity,
          subtotal: product.price * quantity,
        };
      })
      .filter((line) => line != null);
  }, [sellableProducts, quantities]);

  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

  function resetForm() {
    setBuyerName("");
    setBuyerWhatsapp("");
    setBuyerDni("");
    setBuyerEmail("");
    setTicketId("");
    setNotes("");
    setPaymentStatus("paid");
    setQuantities({});
    setError(null);
    setSuccess(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function setQuantity(productId: string, rawValue: string, max: number | null) {
    const parsed = rawValue === "" ? 0 : Number.parseInt(rawValue, 10);
    const quantity = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const capped =
      max != null ? Math.min(quantity, max) : quantity;

    setQuantities((current) => ({
      ...current,
      [productId]: capped,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await createManualKioskOrderAction(eventId, {
      buyerName,
      buyerWhatsapp: buyerWhatsapp.trim() || null,
      buyerDni: buyerDni.trim() || null,
      buyerEmail: buyerEmail.trim() || null,
      ticketId: ticketId.trim() || null,
      paymentStatus,
      notes: notes.trim() || null,
      items: lines.map((line) => ({
        eventKioskProductId: line.product.id,
        quantity: line.quantity,
      })),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSuccess(
      `Venta registrada · ${result.orderCode} · ${formatKioskMoney(result.totalAmount)}`,
    );
    router.refresh();

    window.setTimeout(() => {
      handleClose();
    }, 1200);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Nueva venta manual"
      className="max-w-2xl"
    >
      {sellableProducts.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No hay productos disponibles para vender. Agregá productos al evento y
          asegurate de que estén activos y con stock.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Comprador *">
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className={adminInputClassName}
                required
              />
            </Field>
            <Field label="WhatsApp">
              <input
                type="text"
                value={buyerWhatsapp}
                onChange={(e) => setBuyerWhatsapp(e.target.value)}
                className={adminInputClassName}
              />
            </Field>
            <Field label="DNI">
              <input
                type="text"
                value={buyerDni}
                onChange={(e) => setBuyerDni(e.target.value)}
                className={adminInputClassName}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                className={adminInputClassName}
              />
            </Field>
            <Field label="ID entrada (opcional)">
              <input
                type="text"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                className={adminInputClassName}
                placeholder="UUID de ticket"
              />
            </Field>
            <Field label="Estado de pago">
              <select
                value={paymentStatus}
                onChange={(e) =>
                  setPaymentStatus(e.target.value as "pending" | "paid")
                }
                className={adminSelectClassName}
              >
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
              </select>
            </Field>
          </div>

          <Field label="Notas">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={adminInputClassName}
            />
          </Field>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Productos
            </p>
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {sellableProducts.map((product) => {
                const available = getKioskStockAvailable(product);
                const quantity = quantities[product.id] ?? 0;
                const subtotal = product.price * quantity;

                return (
                  <div
                    key={product.id}
                    className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_88px_96px]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {product.product_name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatKioskMoney(product.price)} · restante{" "}
                        {formatKioskStockRemaining(product)}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={available ?? undefined}
                      step={1}
                      value={quantity || ""}
                      onChange={(e) =>
                        setQuantity(product.id, e.target.value, available)
                      }
                      className={adminInputClassName}
                      placeholder="0"
                    />
                    <p className="self-center text-right text-sm font-semibold text-purple-200">
                      {formatKioskMoney(subtotal)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-purple-400/20 bg-purple-400/10 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-purple-200">
              Total
            </p>
            <p className="text-2xl font-black text-white">
              {formatKioskMoney(total)}
            </p>
          </div>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={loading || lines.length === 0}
            >
              Confirmar venta
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {children}
    </label>
  );
}
