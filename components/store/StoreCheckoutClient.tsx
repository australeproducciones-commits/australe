"use client";

import { useState, useTransition } from "react";
import { useStoreCart } from "@/components/store/StoreCartProvider";
import { PageContainer, PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";
import { createStoreOrderAction } from "@/lib/store/actions";

export function StoreCheckoutClient({
  isLoggedIn,
  isCommunityMember,
  defaultName,
  defaultEmail,
}: {
  isLoggedIn: boolean;
  isCommunityMember: boolean;
  defaultName?: string | null;
  defaultEmail?: string | null;
}) {
  const { items, clearCart, eventSlug } = useStoreCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    orderNumber: string;
    pickupCode: string;
  } | null>(null);

  const [form, setForm] = useState({
    customerName: defaultName ?? "",
    customerEmail: defaultEmail ?? "",
    customerPhone: "",
    applyCommunityPrice: isCommunityMember,
  });

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
        orderNumber: result.orderNumber ?? "",
        pickupCode: result.pickupCode ?? "",
      });
    });
  }

  if (success) {
    return (
      <PageContainer>
        <PublicCard padding="lg" className="text-center">
          <h1 className="public-heading text-2xl font-bold">¡Pedido reservado!</h1>
          <p className="mt-3 text-sm public-text-muted">
            Número de pedido: <strong>{success.orderNumber}</strong>
          </p>
          <p className="mt-2 text-sm public-text-muted">
            Código de retiro: <strong>{success.pickupCode}</strong>
          </p>
          <p className="mt-4 text-sm public-text-muted">
            Tenés 30 minutos para completar el pago. Un administrador confirmará
            tu pago y te avisaremos cuando esté listo para retirar.
          </p>
          <PublicButton href={ROUTES.tienda} variant="primary" className="mt-6">
            Volver a la tienda
          </PublicButton>
        </PublicCard>
      </PageContainer>
    );
  }

  if (items.length === 0) {
    return (
      <PageContainer>
        <PublicCard padding="lg" className="text-center">
          <p>No hay productos en el carrito.</p>
          <PublicButton href={ROUTES.tienda} variant="primary" className="mt-4">
            Ir a la tienda
          </PublicButton>
        </PublicCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="public-heading text-3xl font-black">Checkout</h1>
      <p className="mt-2 text-sm public-text-muted">
        Completá tus datos para reservar el pedido.
        {!isLoggedIn ? " Podés comprar como invitado." : null}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-2">
        <PublicCard padding="lg" className="space-y-4">
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
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>
          {isCommunityMember ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.applyCommunityPrice}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    applyCommunityPrice: e.target.checked,
                  }))
                }
              />
              Aplicar precio comunidad
            </label>
          ) : null}
        </PublicCard>

        <PublicCard padding="lg">
          <h2 className="public-heading font-bold">Resumen</h2>
          <p className="mt-2 text-sm public-text-muted">
            {items.length} líneas en el carrito
          </p>
          {eventSlug ? (
            <p className="mt-1 text-xs public-text-muted">Evento: {eventSlug}</p>
          ) : null}
          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          <PublicButton
            type="submit"
            variant="primary"
            className="mt-6 w-full"
            disabled={pending}
          >
            {pending ? "Reservando..." : "Confirmar reserva"}
          </PublicButton>
          <p className="mt-3 text-xs public-text-muted">
            El pago se confirma manualmente o por transferencia según
            instrucciones de Australe.
          </p>
        </PublicCard>
      </form>
    </PageContainer>
  );
}
