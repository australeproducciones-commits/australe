"use client";

import { useEffect, useState } from "react";
import { PageContainer, PublicButton, PublicCard } from "@/components/ui/public";
import { ROUTES } from "@/lib/constants/routes";

type PaymentStatusResponse = {
  order: {
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentProvider: string | null;
    paidAt: string | null;
    reservedUntil: string | null;
  };
  transactions: Array<{ status: string; status_detail: string | null }>;
};

export function StorePaymentReturnClient({
  orderNumber,
  variant,
}: {
  orderNumber: string;
  variant: "success" | "pending" | "error";
}) {
  const [status, setStatus] = useState<PaymentStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function fetchStatus() {
      try {
        const response = await fetch(
          `/api/store/orders/${encodeURIComponent(orderNumber)}/payment-status`,
          { cache: "no-store" },
        );
        if (!response.ok) {
          return;
        }
        const data = (await response.json()) as PaymentStatusResponse;
        if (!cancelled) {
          setStatus(data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchStatus();

    if (variant !== "error" && polls < 12) {
      timer = setTimeout(() => {
        setPolls((p) => p + 1);
      }, 5000);
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderNumber, variant, polls]);

  const paymentConfirmed = status?.order.paymentStatus === "confirmed";
  const paymentReview = status?.order.paymentStatus === "review";
  const paymentFailed = status?.order.paymentStatus === "failed";

  const titles = {
    success: paymentConfirmed
      ? "¡Pago confirmado!"
      : paymentReview
        ? "Pago en revisión"
        : "Estamos verificando tu pago",
    pending: paymentConfirmed
      ? "¡Pago confirmado!"
      : "Pago pendiente de confirmación",
    error: paymentFailed ? "Pago no aprobado" : "Hubo un problema con el pago",
  };

  const descriptions = {
    success: paymentConfirmed
      ? "Tu pedido fue acreditado. Podés ver el detalle en Mis pedidos."
      : paymentReview
        ? "Recibimos tu pago pero la reserva expiró. Un administrador revisará el caso."
        : "Mercado Pago puede tardar unos segundos. Esta página se actualiza automáticamente.",
    pending: paymentConfirmed
      ? "Tu pedido ya está pagado."
      : "Tu pago está pendiente. Te avisaremos cuando se confirme.",
    error: paymentFailed
      ? "El pago fue rechazado. Si tu reserva sigue vigente, podés reintentar desde Mis pedidos."
      : "No pudimos confirmar el pago todavía. Revisá Mis pedidos en unos minutos.",
  };

  return (
    <PageContainer>
      <PublicCard padding="lg" className="mx-auto max-w-lg text-center">
        <h1 className="public-heading text-2xl font-bold">{titles[variant]}</h1>
        <p className="mt-3 text-sm public-text-muted">
          Pedido <strong>{orderNumber}</strong>
        </p>
        <p className="mt-4 text-sm public-text-muted">{descriptions[variant]}</p>
        {loading ? (
          <p className="mt-4 text-xs public-text-muted">Consultando estado...</p>
        ) : status ? (
          <p className="mt-4 text-xs public-text-muted">
            Estado interno: {status.order.status} / {status.order.paymentStatus}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <PublicButton href={ROUTES.miCuentaPedidos} variant="primary">
            Mis pedidos
          </PublicButton>
          <PublicButton href={ROUTES.tienda} variant="outline">
            Volver a la tienda
          </PublicButton>
        </div>
      </PublicCard>
    </PageContainer>
  );
}
