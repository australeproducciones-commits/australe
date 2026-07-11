"use client";

import { useState, useTransition } from "react";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { useCartLineDetails } from "@/components/store/hooks/useCartLineDetails";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { createStoreOrderAction } from "@/lib/store/actions";
import { formatStorePrice } from "@/lib/store/utils";

export function StoreCheckoutClient({
  isLoggedIn,
  isCommunityMember,
  defaultName,
  defaultEmail,
  mercadoPagoEnabled,
}: {
  isLoggedIn: boolean;
  isCommunityMember: boolean;
  defaultName?: string | null;
  defaultEmail?: string | null;
  mercadoPagoEnabled: boolean;
}) {
  const { items, clearCart, eventSlug } = useStoreCart();
  const { lines } = useCartLineDetails(items);
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    orderId: string;
    orderNumber: string;
    pickupCode: string;
    total: number;
  } | null>(null);

  const [form, setForm] = useState({
    customerName: defaultName ?? "",
    customerEmail: defaultEmail ?? "",
    customerPhone: "",
    applyCommunityPrice: isCommunityMember,
  });

  const estimatedTotal = lines.reduce((sum, line) => {
    const item = items.find(
      (i) =>
        i.productId === line.productId &&
        (i.variantId ?? null) === (line.variantId ?? null),
    );
    return sum + line.unitPrice * (item?.quantity ?? 0);
  }, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createStoreOrderAction({
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        eventId: null,
        pickupEventId: null,
        applyCommunityPrice: form.applyCommunityPrice,
        items,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo crear el pedido.");
        return;
      }

      clearCart();
      setSuccess({
        orderId: result.orderId ?? "",
        orderNumber: result.orderNumber ?? "",
        pickupCode: result.pickupCode ?? "",
        total: result.total ?? 0,
      });
    });
  }

  async function handlePayWithMercadoPago() {
    if (!success || paying) {
      return;
    }

    setPaying(true);
    setError(null);

    try {
      const response = await fetch("/api/store/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: success.orderId,
          pickupCode: success.pickupCode,
        }),
      });

      const data = (await response.json()) as { initPoint?: string; error?: string };

      if (!response.ok || !data.initPoint) {
        setError(data.error ?? "No se pudo iniciar el pago con Mercado Pago.");
        setPaying(false);
        return;
      }

      window.location.href = data.initPoint;
    } catch {
      setError("Error de conexión al iniciar el pago.");
      setPaying(false);
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
        <div className="store-surface rounded-2xl p-8 text-center sm:p-10">
          <p className="store-badge">Reserva confirmada</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">¡Pedido reservado!</h1>
          <div className="mt-6 space-y-2 text-sm text-[var(--public-text-secondary)]">
            <p>
              Pedido <strong className="text-[var(--public-text)]">{success.orderNumber}</strong>
            </p>
            <p>
              Código de retiro{" "}
              <strong className="text-[var(--public-text)]">{success.pickupCode}</strong>
            </p>
            <p className="text-lg font-bold text-[var(--public-text)]">
              {formatStorePrice(success.total)}
            </p>
          </div>
          <p className="mt-5 text-sm text-[var(--public-text-secondary)]">
            Tenés 30 minutos para completar el pago.
          </p>

          {mercadoPagoEnabled ? (
            <div className="mt-8 space-y-3">
              <PublicButton
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={paying}
                onClick={handlePayWithMercadoPago}
              >
                {paying ? "Redirigiendo a Mercado Pago..." : "Pagar con Mercado Pago"}
              </PublicButton>
              <p className="text-xs text-[var(--public-text-soft)]">
                Pago procesado de forma segura. Medios offline excluidos por la
                duración de la reserva.
              </p>
            </div>
          ) : (
            <p className="mt-6 text-sm text-[var(--public-text-secondary)]">
              Un administrador confirmará tu pago según las instrucciones de
              Australe.
            </p>
          )}

          {error ? (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <PublicButton href={ROUTES.tienda} variant="outline" className="mt-8">
            Volver a la tienda
          </PublicButton>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center sm:px-6">
        <div className="store-surface rounded-2xl p-8">
          <p className="text-[var(--public-text-secondary)]">Tu carrito está vacío.</p>
          <PublicButton href={ROUTES.tienda} variant="primary" className="mt-6">
            Ir a la tienda
          </PublicButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--public-text-soft)]">
        Finalizar compra
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">Checkout</h1>
      <p className="mt-2 text-sm text-[var(--public-text-secondary)]">
        Completá tus datos para reservar el pedido.
        {!isLoggedIn ? " Podés comprar como invitado." : null}
      </p>

      <form onSubmit={handleSubmit} className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="store-surface space-y-5 rounded-2xl p-6 lg:col-span-3">
          <h2 className="text-lg font-bold">Tus datos</h2>
          <div>
            <label className="text-sm font-semibold" htmlFor="name">
              Nombre
            </label>
            <input
              id="name"
              required
              value={form.customerName}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerName: e.target.value }))
              }
              className="store-input mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={form.customerEmail}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerEmail: e.target.value }))
              }
              className="store-input mt-2"
            />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="phone">
              Teléfono / WhatsApp
            </label>
            <input
              id="phone"
              value={form.customerPhone}
              onChange={(e) =>
                setForm((f) => ({ ...f, customerPhone: e.target.value }))
              }
              className="store-input mt-2"
            />
          </div>
          {isCommunityMember ? (
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.applyCommunityPrice}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    applyCommunityPrice: e.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-[var(--public-border)]"
              />
              Aplicar precio comunidad
            </label>
          ) : null}
        </div>

        <div className="store-surface rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-lg font-bold">Resumen</h2>
          <ul className="mt-4 space-y-3 border-b border-[var(--public-border)] pb-4">
            {lines.map((line) => {
              const item = items.find(
                (i) =>
                  i.productId === line.productId &&
                  (i.variantId ?? null) === (line.variantId ?? null),
              );
              if (!item) return null;
              return (
                <li
                  key={`${line.productId}:${line.variantId}`}
                  className="flex justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--public-text-secondary)]">
                    {line.productName}
                    {line.variantName ? ` · ${line.variantName}` : ""} × {item.quantity}
                  </span>
                  <span className="shrink-0 font-medium">
                    {formatStorePrice(line.unitPrice * item.quantity)}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex justify-between font-semibold">
            <span>Total estimado</span>
            <span className="text-xl">
              {estimatedTotal > 0 ? formatStorePrice(estimatedTotal) : "—"}
            </span>
          </div>
          {eventSlug ? (
            <p className="mt-2 text-xs text-[var(--public-text-soft)]">
              Contexto evento: {eventSlug}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <PublicButton
            type="submit"
            variant="primary"
            size="lg"
            className="mt-6 w-full"
            disabled={pending}
          >
            {pending ? "Reservando..." : "Confirmar reserva"}
          </PublicButton>
          <p className="mt-4 text-xs leading-relaxed text-[var(--public-text-soft)]">
            {mercadoPagoEnabled
              ? "Después de reservar podrás pagar con Mercado Pago de forma segura."
              : "El pago se confirma manualmente según instrucciones de Australe."}
          </p>
          <p className="mt-2 text-xs text-[var(--public-text-soft)]">
            ◈ Compra segura · Reserva de stock por 30 minutos
          </p>
        </div>
      </form>
    </div>
  );
}
