"use client";

import { useMemo, useState, useTransition } from "react";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { useCartLineDetails } from "@/components/store/hooks/useCartLineDetails";
import { PublicButton } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import type { StoreCheckoutPaymentAvailability } from "@/lib/payments/config";
import { createStoreOrderAction } from "@/lib/store/actions";
import {
  STORE_PAYMENT_CHANNEL,
  type StorePaymentChannel,
} from "@/lib/store/payment-channels";
import { formatStorePrice } from "@/lib/store/utils";

function formatExpiry(iso?: string): string {
  if (!iso) {
    return "30 minutos";
  }
  return new Date(iso).toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

type PaymentCardProps = {
  id: StorePaymentChannel;
  title: string;
  description: string;
  footnote?: string;
  selected: boolean;
  onSelect: () => void;
};

function PaymentOptionCard({
  id,
  title,
  description,
  footnote,
  selected,
  onSelect,
}: PaymentCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-[var(--public-accent)] bg-[var(--public-accent)]/10 ring-2 ring-[var(--public-accent)]/40"
          : "border-[var(--public-border)] bg-[var(--public-surface)] hover:border-[var(--public-accent)]/50"
      }`}
    >
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-2 text-sm text-[var(--public-text-secondary)]">{description}</p>
      {footnote ? (
        <p className="mt-3 text-xs text-[var(--public-text-soft)]">{footnote}</p>
      ) : null}
      <span className="sr-only">{selected ? "Seleccionado" : "No seleccionado"}</span>
    </button>
  );
}

export function StoreCheckoutClient({
  isLoggedIn,
  isCommunityMember,
  defaultName,
  defaultEmail,
  paymentAvailability,
}: {
  isLoggedIn: boolean;
  isCommunityMember: boolean;
  defaultName?: string | null;
  defaultEmail?: string | null;
  paymentAvailability: StoreCheckoutPaymentAvailability;
}) {
  const { items, clearCart, eventSlug } = useStoreCart();
  const { lines } = useCartLineDetails(items);
  const [pending, startTransition] = useTransition();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentChannel, setPaymentChannel] = useState<StorePaymentChannel | null>(null);
  const [success, setSuccess] = useState<{
    orderId: string;
    orderNumber: string;
    pickupCode: string;
    total: number;
    reservedUntil?: string;
    paymentChannel: StorePaymentChannel;
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

  const defaultChannel = useMemo((): StorePaymentChannel | null => {
    if (paymentAvailability.hybrid) {
      return null;
    }
    if (paymentAvailability.mercadoPago) {
      return STORE_PAYMENT_CHANNEL.MERCADOPAGO;
    }
    if (paymentAvailability.manual) {
      return STORE_PAYMENT_CHANNEL.MANUAL;
    }
    return null;
  }, [paymentAvailability]);

  const effectiveChannel = paymentChannel ?? defaultChannel;

  async function redirectToMercadoPago(order: {
    orderId: string;
    pickupCode: string;
  }) {
    setPaying(true);
    setError(null);

    try {
      const response = await fetch("/api/store/payments/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
          pickupCode: order.pickupCode,
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!effectiveChannel) {
      setError("Seleccioná cómo querés pagar para continuar.");
      return;
    }

    startTransition(async () => {
      const result = await createStoreOrderAction({
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone,
        eventId: null,
        pickupEventId: null,
        applyCommunityPrice: form.applyCommunityPrice,
        paymentChannel: effectiveChannel,
        items,
      });

      if (!result.success) {
        setError(result.error ?? "No se pudo crear el pedido.");
        return;
      }

      clearCart();

      const orderPayload = {
        orderId: result.orderId ?? "",
        orderNumber: result.orderNumber ?? "",
        pickupCode: result.pickupCode ?? "",
        total: result.total ?? 0,
        reservedUntil: result.reservedUntil,
        paymentChannel: effectiveChannel,
      };

      if (effectiveChannel === STORE_PAYMENT_CHANNEL.MERCADOPAGO) {
        await redirectToMercadoPago({
          orderId: orderPayload.orderId,
          pickupCode: orderPayload.pickupCode,
        });
        return;
      }

      setSuccess(orderPayload);
    });
  }

  if (paymentAvailability.disabled) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center sm:px-6">
        <div className="store-surface rounded-2xl p-8">
          <h1 className="text-xl font-bold">Checkout no disponible</h1>
          <p className="mt-3 text-sm text-[var(--public-text-secondary)]">
            En este momento no hay medios de pago habilitados para la tienda. Volvé a
            intentar más tarde o contactanos.
          </p>
          <PublicButton href={ROUTES.tienda} variant="primary" className="mt-6">
            Volver a la tienda
          </PublicButton>
        </div>
      </div>
    );
  }

  if (success?.paymentChannel === STORE_PAYMENT_CHANNEL.MANUAL) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-16">
        <div className="store-surface rounded-2xl p-8 text-center sm:p-10">
          <p className="store-badge">Pedido reservado</p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Pedido reservado</h1>
          <p className="mt-4 text-sm text-[var(--public-text-secondary)]">
            Tenés 30 minutos para completar el pago en caja. Mostrá este número de pedido
            al personal de Australe.
          </p>
          <div className="mt-6 space-y-2 text-sm text-[var(--public-text-secondary)]">
            <p>
              Número de pedido{" "}
              <strong className="text-[var(--public-text)]">{success.orderNumber}</strong>
            </p>
            <p className="text-lg font-bold text-[var(--public-text)]">
              {formatStorePrice(success.total)}
            </p>
            <p>
              Vencimiento de reserva:{" "}
              <strong className="text-[var(--public-text)]">
                {formatExpiry(success.reservedUntil)}
              </strong>
            </p>
            <p>
              Estado: <strong className="text-amber-300">Pendiente de pago</strong>
            </p>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-[var(--public-text-soft)]">
            La reserva se libera automáticamente si el pago no es confirmado a tiempo.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isLoggedIn ? (
              <PublicButton href={ROUTES.miCuentaPedidos} variant="primary">
                Ver mis pedidos
              </PublicButton>
            ) : null}
            <PublicButton href={ROUTES.tienda} variant="outline">
              Volver a la tienda
            </PublicButton>
          </div>
        </div>
      </div>
    );
  }

  if (success?.paymentChannel === STORE_PAYMENT_CHANNEL.MERCADOPAGO) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center sm:px-6">
        <div className="store-surface rounded-2xl p-8">
          <h1 className="text-xl font-bold">Redirigiendo a Mercado Pago</h1>
          <p className="mt-3 text-sm text-[var(--public-text-secondary)]">
            Pedido {success.orderNumber}. Si no se abre automáticamente, intentá nuevamente.
          </p>
          {error ? (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          <PublicButton
            type="button"
            variant="primary"
            className="mt-6"
            disabled={paying}
            onClick={() =>
              redirectToMercadoPago({
                orderId: success.orderId,
                pickupCode: success.pickupCode,
              })
            }
          >
            {paying ? "Redirigiendo..." : "Pagar con Mercado Pago"}
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
        Completá tus datos y elegí cómo pagar.
        {!isLoggedIn ? " Podés comprar como invitado." : null}
      </p>

      <form onSubmit={handleSubmit} className="mt-10 grid gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          <div className="store-surface space-y-5 rounded-2xl p-6">
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

          <div className="store-surface space-y-4 rounded-2xl p-6">
            <h2 className="text-lg font-bold">Medio de pago</h2>
            <p className="text-sm text-[var(--public-text-secondary)]">
              Elegí una opción para continuar.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {paymentAvailability.mercadoPago ? (
                <PaymentOptionCard
                  id={STORE_PAYMENT_CHANNEL.MERCADOPAGO}
                  title="Pagar con Mercado Pago"
                  description="Pagá online de forma segura con los medios disponibles en Mercado Pago."
                  selected={effectiveChannel === STORE_PAYMENT_CHANNEL.MERCADOPAGO}
                  onSelect={() => setPaymentChannel(STORE_PAYMENT_CHANNEL.MERCADOPAGO)}
                />
              ) : null}
              {paymentAvailability.manual ? (
                <PaymentOptionCard
                  id={STORE_PAYMENT_CHANNEL.MANUAL}
                  title="Pagar en caja"
                  description="Reservamos tus productos durante 30 minutos. El pago deberá ser confirmado por nuestro equipo dentro de ese plazo."
                  footnote="La reserva se libera automáticamente si el pago no es confirmado a tiempo."
                  selected={effectiveChannel === STORE_PAYMENT_CHANNEL.MANUAL}
                  onSelect={() => setPaymentChannel(STORE_PAYMENT_CHANNEL.MANUAL)}
                />
              ) : null}
            </div>
          </div>
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
            disabled={pending || paying}
          >
            {pending || paying
              ? effectiveChannel === STORE_PAYMENT_CHANNEL.MERCADOPAGO
                ? "Creando pedido..."
                : "Reservando..."
              : effectiveChannel === STORE_PAYMENT_CHANNEL.MERCADOPAGO
                ? "Continuar a Mercado Pago"
                : "Reservar pedido"}
          </PublicButton>
          <p className="mt-4 text-xs leading-relaxed text-[var(--public-text-soft)]">
            ◈ Compra segura · Reserva de stock por 30 minutos
          </p>
        </div>
      </form>
    </div>
  );
}
