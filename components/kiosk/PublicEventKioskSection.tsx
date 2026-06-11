"use client";

import { useMemo, useState } from "react";
import { PublicKioskOrderSuccess } from "@/components/kiosk/PublicKioskOrderSuccess";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createPublicKioskOrderAction } from "@/lib/kiosk/actions";
import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import {
  formatKioskMoney,
  formatKioskStockRemaining,
  getKioskStockAvailable,
} from "@/lib/kiosk/utils";

type PublicEventKioskSectionProps = {
  eventId: string;
  eventSlug: string;
  products: PublicEventKioskProduct[];
};

export function PublicEventKioskSection(props: PublicEventKioskSectionProps) {
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <div id="preventa-consumisiones">
      <PublicEventKioskSectionSession
        key={sessionKey}
        {...props}
        onMakeAnother={() => setSessionKey((key) => key + 1)}
      />
    </div>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-purple-400 focus:outline-none";

type SuccessState = {
  orderCode: string;
  totalAmount: number;
  buyerName: string;
  buyerWhatsapp: string | null;
  buyerDni: string | null;
  buyerEmail: string | null;
  lines: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
};

function PublicEventKioskSectionSession({
  eventId,
  eventSlug,
  products,
  onMakeAnother,
}: PublicEventKioskSectionProps & { onMakeAnother: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerDni, setBuyerDni] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const lines = useMemo(() => {
    return products
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
  }, [products, quantities]);

  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

  const hasContact =
    buyerWhatsapp.trim().length > 0 ||
    buyerDni.trim().length > 0 ||
    buyerEmail.trim().length > 0;

  function setQuantity(productId: string, rawValue: string, max: number | null) {
    const parsed = rawValue === "" ? 0 : Number.parseInt(rawValue, 10);
    const quantity = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const capped = max != null ? Math.min(quantity, max) : quantity;

    setQuantities((current) => ({
      ...current,
      [productId]: capped,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!buyerName.trim()) {
      setError("Ingresá tu nombre.");
      return;
    }

    if (!hasContact) {
      setError("Completá al menos WhatsApp, DNI o email.");
      return;
    }

    if (lines.length === 0) {
      setError("Seleccioná al menos un producto.");
      return;
    }

    setLoading(true);

    const result = await createPublicKioskOrderAction(eventId, {
      buyerName: buyerName.trim(),
      buyerWhatsapp: buyerWhatsapp.trim() || null,
      buyerDni: buyerDni.trim() || null,
      buyerEmail: buyerEmail.trim() || null,
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

    setSuccess({
      orderCode: result.orderCode,
      totalAmount: result.totalAmount,
      buyerName: buyerName.trim(),
      buyerWhatsapp: buyerWhatsapp.trim() || null,
      buyerDni: buyerDni.trim() || null,
      buyerEmail: buyerEmail.trim() || null,
      lines: lines.map((line) => ({
        name: line.product.product_name,
        quantity: line.quantity,
        unitPrice: line.product.price,
        subtotal: line.subtotal,
      })),
    });
  }

  if (success) {
    return (
      <PublicKioskOrderSuccess
        title="Consumisiones reservadas"
        subtitle="Presentá este código el día del evento para retirar tus consumisiones."
        orderCode={success.orderCode}
        totalAmount={success.totalAmount}
        lines={success.lines}
        buyerName={success.buyerName}
        buyerWhatsapp={success.buyerWhatsapp}
        buyerDni={success.buyerDni}
        buyerEmail={success.buyerEmail}
        eventSlug={eventSlug}
        onMakeAnother={onMakeAnother}
      />
    );
  }

  return (
    <Card padding="lg" className="mt-8">
      <p className="text-sm uppercase tracking-[0.3em] text-purple-300">
        Kiosco
      </p>
      <h2 className="mt-3 text-2xl font-black text-white">
        Preventa de consumisiones
      </h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        Reservá tus consumisiones para retirar el día del evento. El pago se
        confirma según la modalidad indicada por la organización.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-4">
          {products.map((product) => {
            const stockAvailable = getKioskStockAvailable(product);
            const maxQuantity = stockAvailable ?? 99;

            return (
              <Card key={product.id} padding="md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-white">
                      {product.product_name}
                    </h3>
                    {product.product_description ? (
                      <p className="mt-1 text-sm text-zinc-400">
                        {product.product_description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {product.product_category ? (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-300">
                          {product.product_category}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-purple-500/20 px-3 py-1 text-purple-200">
                        {formatKioskMoney(product.price)}
                      </span>
                      {product.stock_total != null ? (
                        <span className="rounded-full bg-white/10 px-3 py-1 text-zinc-400">
                          Disponibles: {formatKioskStockRemaining(product)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label
                      htmlFor={`kiosk_qty_${product.id}`}
                      className="mb-2 block text-xs uppercase tracking-wider text-zinc-400"
                    >
                      Cantidad
                      {stockAvailable != null ? ` (máx. ${maxQuantity})` : ""}
                    </label>
                    <input
                      id={`kiosk_qty_${product.id}`}
                      type="number"
                      min={0}
                      max={stockAvailable ?? undefined}
                      value={quantities[product.id] ?? 0}
                      disabled={loading}
                      onChange={(changeEvent) =>
                        setQuantity(
                          product.id,
                          changeEvent.target.value,
                          stockAvailable,
                        )
                      }
                      className={`${inputClassName} sm:w-28`}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {lines.length > 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              Resumen
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {lines.map((line) => (
                <li
                  key={line.product.id}
                  className="flex justify-between gap-4 text-zinc-300"
                >
                  <span>
                    {line.product.product_name} × {line.quantity}
                  </span>
                  <span className="shrink-0 text-white">
                    {formatKioskMoney(line.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t border-white/10 pt-4 text-base font-bold text-white">
              <span>Total</span>
              <span>{formatKioskMoney(total)}</span>
            </p>
          </div>
        ) : null}

        <div>
          <h3 className="text-lg font-bold text-white">Datos del comprador</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Completá al menos uno: WhatsApp, DNI o email.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="kiosk_buyer_name"
                className="mb-2 block text-sm text-zinc-300"
              >
                Nombre *
              </label>
              <input
                id="kiosk_buyer_name"
                type="text"
                required
                value={buyerName}
                disabled={loading}
                onChange={(changeEvent) => setBuyerName(changeEvent.target.value)}
                className={inputClassName}
                placeholder="Nombre y apellido"
              />
            </div>

            <div>
              <label
                htmlFor="kiosk_buyer_whatsapp"
                className="mb-2 block text-sm text-zinc-300"
              >
                WhatsApp
              </label>
              <input
                id="kiosk_buyer_whatsapp"
                type="tel"
                value={buyerWhatsapp}
                disabled={loading}
                onChange={(changeEvent) =>
                  setBuyerWhatsapp(changeEvent.target.value)
                }
                className={inputClassName}
                placeholder="Ej. 11 1234-5678"
              />
            </div>

            <div>
              <label
                htmlFor="kiosk_buyer_dni"
                className="mb-2 block text-sm text-zinc-300"
              >
                DNI
              </label>
              <input
                id="kiosk_buyer_dni"
                type="text"
                value={buyerDni}
                disabled={loading}
                onChange={(changeEvent) => setBuyerDni(changeEvent.target.value)}
                className={inputClassName}
                placeholder="Documento"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="kiosk_buyer_email"
                className="mb-2 block text-sm text-zinc-300"
              >
                Email
              </label>
              <input
                id="kiosk_buyer_email"
                type="email"
                value={buyerEmail}
                disabled={loading}
                onChange={(changeEvent) =>
                  setBuyerEmail(changeEvent.target.value)
                }
                className={inputClassName}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="kiosk_notes"
                className="mb-2 block text-sm text-zinc-300"
              >
                Notas (opcional)
              </label>
              <textarea
                id="kiosk_notes"
                rows={3}
                value={notes}
                disabled={loading}
                onChange={(changeEvent) => setNotes(changeEvent.target.value)}
                className={inputClassName}
                placeholder="Aclaraciones para el retiro"
              />
            </div>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading || lines.length === 0}>
          {loading ? "Confirmando…" : "Reservar consumisiones"}
        </Button>
      </form>
    </Card>
  );
}
