"use client";

import { useMemo, useState } from "react";
import { PublicKioskOrderSuccess } from "@/components/kiosk/PublicKioskOrderSuccess";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { SectionHeading } from "@/components/ui/public/SectionHeading";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
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

const inputClassName = "public-input";

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
    <PublicCard padding="lg" className="mt-8">
      <SectionHeading
        label="Consumiciones"
        title="Preventa de consumisiones"
        subtitle="Reservá tus consumisiones para retirar el día del evento. El pago se confirma según la modalidad indicada por la organización."
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div className="space-y-4">
          {products.map((product) => {
            const stockAvailable = getKioskStockAvailable(product);
            const maxQuantity = stockAvailable ?? 99;

            return (
              <PublicCard key={product.id} padding="md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="public-heading text-lg font-bold">
                      {product.product_name}
                    </h3>
                    {product.product_description ? (
                      <p className="mt-1 text-sm public-text-muted">
                        {product.product_description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      {product.product_category ? (
                        <StatusBadge tone="neutral">
                          {product.product_category}
                        </StatusBadge>
                      ) : null}
                      <StatusBadge tone="primary">
                        {formatKioskMoney(product.price)}
                      </StatusBadge>
                      {product.stock_total != null ? (
                        <StatusBadge tone="neutral">
                          Disponibles: {formatKioskStockRemaining(product)}
                        </StatusBadge>
                      ) : null}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <label
                      htmlFor={`kiosk_qty_${product.id}`}
                      className="mb-2 block text-xs uppercase tracking-wider public-text-soft"
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
              </PublicCard>
            );
          })}
        </div>

        {lines.length > 0 ? (
          <div className="public-summary-box">
            <h3 className="text-sm font-semibold uppercase tracking-wider public-text-soft">
              Resumen
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {lines.map((line) => (
                <li
                  key={line.product.id}
                  className="flex justify-between gap-4 public-text-muted"
                >
                  <span>
                    {line.product.product_name} × {line.quantity}
                  </span>
                  <span className="shrink-0 public-heading font-medium">
                    {formatKioskMoney(line.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 flex justify-between border-t pt-4 text-base font-bold public-heading" style={{ borderColor: "var(--public-border)" }}>
              <span>Total</span>
              <span>{formatKioskMoney(total)}</span>
            </p>
          </div>
        ) : null}

        <div>
          <h3 className="public-heading text-lg font-bold">Datos del comprador</h3>
          <p className="mt-1 text-sm public-text-muted">
            Completá al menos uno: WhatsApp, DNI o email.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="kiosk_buyer_name"
                className="mb-2 block text-sm public-text-muted"
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
                className="mb-2 block text-sm public-text-muted"
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
                className="mb-2 block text-sm public-text-muted"
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
                className="mb-2 block text-sm public-text-muted"
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
                className="mb-2 block text-sm public-text-muted"
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

        {error ? <p className="public-alert-error">{error}</p> : null}

        <PublicButton type="submit" disabled={loading || lines.length === 0}>
          {loading ? "Confirmando…" : "Reservar consumisiones"}
        </PublicButton>
      </form>
    </PublicCard>
  );
}
