"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { PublicKioskOrderSuccess } from "@/components/kiosk/PublicKioskOrderSuccess";
import { PublicKioskQuantityErrorModal } from "@/components/kiosk/PublicKioskQuantityErrorModal";
import { PublicAccordion } from "@/components/ui/public/PublicAccordion";
import { PublicButton } from "@/components/ui/public/PublicButton";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import { buildLoginUrl } from "@/lib/auth/loginRedirect";
import { ROUTES } from "@/lib/constants/routes";
import { createPublicKioskOrderAction } from "@/lib/kiosk/actions";
import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import {
  exceedsKioskMaxPerOrder,
  formatKioskMoney,
  formatKioskStockRemaining,
  getKioskCommunityPriceLabel,
  getKioskPublicUnitPrice,
  getKioskCatalogStockAvailable,
  PUBLIC_KIOSK_QUANTITY_NOT_ALLOWED,
} from "@/lib/kiosk/utils";
import { isNextImageOptimizable } from "@/lib/utils/imageHosts";
import { cn } from "@/lib/utils/cn";

type EventDetailKioskPresaleProps = {
  eventId: string;
  eventSlug: string;
  products: PublicEventKioskProduct[];
  isLoggedIn: boolean;
  isCommunityMember: boolean;
};

export function EventDetailKioskPresale({
  eventId,
  eventSlug,
  products,
  isLoggedIn,
  isCommunityMember,
}: EventDetailKioskPresaleProps) {
  const [sessionKey, setSessionKey] = useState(0);
  const returnTo = `${ROUTES.evento(eventSlug)}#preventa-consumisiones`;

  return (
    <div id="preventa-consumisiones">
      <PublicAccordion
        id="preventa-consumiciones"
        title="Preventa de consumiciones"
        subtitle="Reservá bebidas, comidas y productos para el evento"
        badges={
          <>
            <StatusBadge tone="primary">Preventa de consumiciones</StatusBadge>
            <StatusBadge tone="community">Exclusivo comunidad</StatusBadge>
            <span className="text-xs font-medium public-text-soft">
              {products.length}{" "}
              {products.length === 1
                ? "producto disponible"
                : "productos disponibles"}
            </span>
          </>
        }
        defaultOpen={false}
      >
        <PublicEventKioskPresaleSession
          key={sessionKey}
          eventId={eventId}
          eventSlug={eventSlug}
          products={products}
          isLoggedIn={isLoggedIn}
          isCommunityMember={isCommunityMember}
          returnTo={returnTo}
          onMakeAnother={() => setSessionKey((key) => key + 1)}
        />
      </PublicAccordion>
    </div>
  );
}

type SessionProps = EventDetailKioskPresaleProps & {
  returnTo: string;
  onMakeAnother: () => void;
};

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

const inputClassName = "public-input";

function PublicEventKioskPresaleSession({
  eventId,
  eventSlug,
  products,
  isLoggedIn,
  isCommunityMember,
  returnTo,
  onMakeAnother,
}: SessionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [buyerDni, setBuyerDni] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [quantityErrorOpen, setQuantityErrorOpen] = useState(false);

  const canPurchase = isLoggedIn && isCommunityMember;

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
          subtotal:
            getKioskPublicUnitPrice(product, isCommunityMember) * quantity,
        };
      })
      .filter((line) => line != null);
  }, [products, quantities, isCommunityMember]);

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

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (!canPurchase) {
      return;
    }

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

    if (
      lines.some((line) =>
        exceedsKioskMaxPerOrder(line.product.max_per_order, line.quantity),
      )
    ) {
      setQuantityErrorOpen(true);
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
      if (result.message === PUBLIC_KIOSK_QUANTITY_NOT_ALLOWED) {
        setQuantityErrorOpen(true);
        return;
      }
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
        unitPrice: getKioskPublicUnitPrice(line.product, isCommunityMember),
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
    <>
      {!canPurchase ? (
        <CommunityPresaleGate
          isLoggedIn={isLoggedIn}
          returnTo={returnTo}
        />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <ul className="space-y-2">
          {products.map((product) => (
            <KioskProductRow
              key={product.id}
              product={product}
              quantity={quantities[product.id] ?? 0}
              isCommunityMember={isCommunityMember}
              canPurchase={canPurchase}
              loading={loading}
              onQuantityChange={(value) => {
                const stockAvailable = getKioskCatalogStockAvailable(product);
                setQuantity(product.id, value, stockAvailable);
              }}
            />
          ))}
        </ul>

        {canPurchase && lines.length > 0 ? (
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
            <p
              className="mt-4 flex justify-between border-t pt-4 text-base font-bold public-heading"
              style={{ borderColor: "var(--public-border)" }}
            >
              <span>Total</span>
              <span>{formatKioskMoney(total)}</span>
            </p>
          </div>
        ) : null}

        {canPurchase ? (
          <div className="rounded-2xl border p-4 sm:p-5" style={{ borderColor: "var(--public-border)" }}>
            <h3 className="public-heading text-base font-bold">Datos del comprador</h3>
            <p className="mt-1 text-sm public-text-muted">
              Completá al menos uno: WhatsApp, DNI o email.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="kiosk_buyer_name" className="mb-1.5 block text-sm public-text-muted">
                  Nombre *
                </label>
                <input
                  id="kiosk_buyer_name"
                  type="text"
                  required
                  value={buyerName}
                  disabled={loading}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className={inputClassName}
                  placeholder="Nombre y apellido"
                />
              </div>
              <div>
                <label htmlFor="kiosk_buyer_whatsapp" className="mb-1.5 block text-sm public-text-muted">
                  WhatsApp
                </label>
                <input
                  id="kiosk_buyer_whatsapp"
                  type="tel"
                  value={buyerWhatsapp}
                  disabled={loading}
                  onChange={(e) => setBuyerWhatsapp(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="kiosk_buyer_dni" className="mb-1.5 block text-sm public-text-muted">
                  DNI
                </label>
                <input
                  id="kiosk_buyer_dni"
                  type="text"
                  value={buyerDni}
                  disabled={loading}
                  onChange={(e) => setBuyerDni(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="kiosk_buyer_email" className="mb-1.5 block text-sm public-text-muted">
                  Email
                </label>
                <input
                  id="kiosk_buyer_email"
                  type="email"
                  value={buyerEmail}
                  disabled={loading}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className={inputClassName}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="kiosk_notes" className="mb-1.5 block text-sm public-text-muted">
                  Notas (opcional)
                </label>
                <textarea
                  id="kiosk_notes"
                  rows={2}
                  value={notes}
                  disabled={loading}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClassName}
                />
              </div>
            </div>

            {error ? <p className="public-alert-error mt-3">{error}</p> : null}

            <PublicButton
              type="submit"
              className="mt-4"
              disabled={loading || lines.length === 0}
            >
              {loading ? "Confirmando…" : "Reservar consumisiones"}
            </PublicButton>
          </div>
        ) : null}
      </form>

      <PublicKioskQuantityErrorModal
        open={quantityErrorOpen}
        onClose={() => setQuantityErrorOpen(false)}
      />
    </>
  );
}

function CommunityPresaleGate({
  isLoggedIn,
  returnTo,
}: {
  isLoggedIn: boolean;
  returnTo: string;
}) {
  const loginHref = buildLoginUrl(returnTo);

  return (
    <div
      className="mb-4 rounded-2xl border px-4 py-3 text-sm"
      style={{
        borderColor: "var(--public-border)",
        backgroundColor: "var(--public-card-tint)",
      }}
    >
      <p className="public-text-muted">
        {isLoggedIn
          ? "Necesitás ser miembro de la comunidad para acceder a la preventa."
          : "La preventa de consumiciones es exclusiva para miembros de la comunidad."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {!isLoggedIn ? (
          <PublicButton href={loginHref} size="sm">
            Iniciar sesión
          </PublicButton>
        ) : null}
        <PublicButton href={ROUTES.comunidad} variant="outline" size="sm">
          Sumarme a la comunidad
        </PublicButton>
      </div>
    </div>
  );
}

function KioskProductRow({
  product,
  quantity,
  isCommunityMember,
  canPurchase,
  loading,
  onQuantityChange,
}: {
  product: PublicEventKioskProduct;
  quantity: number;
  isCommunityMember: boolean;
  canPurchase: boolean;
  loading: boolean;
  onQuantityChange: (value: string) => void;
}) {
  const stockAvailable = getKioskCatalogStockAvailable(product);
  const unitPrice = getKioskPublicUnitPrice(product, isCommunityMember);
  const communityLabel = getKioskCommunityPriceLabel(
    product.community_price,
    isCommunityMember,
  );
  const soldOut = stockAvailable === 0;

  return (
    <li
      className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-4"
      style={{ borderColor: "var(--public-border)", backgroundColor: "var(--public-card)" }}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ProductThumb
          src={product.product_image_url}
          alt={product.product_name}
        />
        <div className="min-w-0 flex-1">
          <h3 className="public-heading text-sm font-bold sm:text-base">
            {product.product_name}
          </h3>
          {product.product_description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed public-text-muted sm:text-sm">
              {product.product_description}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {communityLabel ? (
              <span className="text-sm font-bold text-[var(--public-primary)]">
                {communityLabel}
              </span>
            ) : (
              <span className="text-sm font-bold public-heading">
                {formatKioskMoney(unitPrice)}
              </span>
            )}
            {soldOut ? (
              <StatusBadge tone="warning">Agotado</StatusBadge>
            ) : stockAvailable != null ? (
              <StatusBadge tone="neutral">
                {formatKioskStockRemaining(product)}
              </StatusBadge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
        <label htmlFor={`kiosk_qty_${product.id}`} className="sr-only">
          Cantidad de {product.product_name}
        </label>
        <input
          id={`kiosk_qty_${product.id}`}
          type="number"
          min={0}
          max={stockAvailable ?? undefined}
          value={quantity}
          disabled={loading || !canPurchase || soldOut}
          onChange={(e) => onQuantityChange(e.target.value)}
          className={cn(inputClassName, "h-10 w-16 text-center text-sm")}
          aria-label={`Cantidad de ${product.product_name}`}
        />
      </div>
    </li>
  );
}

function ProductThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border text-lg sm:h-20 sm:w-20"
        style={{
          borderColor: "var(--public-border)",
          backgroundColor: "var(--public-card-tint)",
          color: "var(--public-secondary)",
        }}
        aria-hidden
      >
        ✦
      </div>
    );
  }

  return (
    <div
      className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border sm:h-20 sm:w-20"
      style={{ borderColor: "var(--public-border)", backgroundColor: "var(--public-card-tint)" }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="80px"
        className="object-contain object-center"
        unoptimized={!isNextImageOptimizable(src)}
      />
    </div>
  );
}

// Compatibilidad con otras rutas que importan el componente anterior.
export function PublicEventKioskSection(props: EventDetailKioskPresaleProps) {
  return <EventDetailKioskPresale {...props} />;
}
