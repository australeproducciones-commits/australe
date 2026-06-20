"use client";

import { useMemo } from "react";
import { PublicCard } from "@/components/ui/public/PublicCard";
import { StatusBadge } from "@/components/ui/public/StatusBadge";
import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import {
  formatKioskMoney,
  formatKioskStockRemaining,
  getKioskCommunityPriceLabel,
  getKioskPublicUnitPrice,
  getKioskCatalogStockAvailable,
} from "@/lib/kiosk/utils";

export type PublicKioskPickerLine = {
  product: PublicEventKioskProduct;
  quantity: number;
  subtotal: number;
};

type PublicEventKioskInlinePickerProps = {
  products: PublicEventKioskProduct[];
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
  disabled?: boolean;
  isCommunityMember?: boolean;
};

export function buildPublicKioskPickerLines(
  products: PublicEventKioskProduct[],
  value: Record<string, number>,
  isCommunityMember = false,
): PublicKioskPickerLine[] {
  return products
    .map((product) => {
      const quantity = value[product.id] ?? 0;
      if (quantity <= 0) {
        return null;
      }

      const unitPrice = getKioskPublicUnitPrice(product, isCommunityMember);

      return {
        product,
        quantity,
        subtotal: unitPrice * quantity,
      };
    })
    .filter((line): line is PublicKioskPickerLine => line != null);
}

export function PublicEventKioskInlinePicker({
  products,
  value,
  onChange,
  disabled = false,
  isCommunityMember = false,
}: PublicEventKioskInlinePickerProps) {
  const lines = useMemo(
    () => buildPublicKioskPickerLines(products, value, isCommunityMember),
    [products, value, isCommunityMember],
  );

  const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

  function setQuantity(
    productId: string,
    rawValue: string,
    max: number | null,
  ) {
    const parsed = rawValue === "" ? 0 : Number.parseInt(rawValue, 10);
    const quantity = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const capped = max != null ? Math.min(quantity, max) : quantity;

    onChange({
      ...value,
      [productId]: capped,
    });
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="public-heading text-lg font-bold">Sumar consumisiones</h3>
        <p className="mt-1 text-sm public-text-muted">
          Las consumisiones quedan reservadas para retirar el día del evento.
          Es opcional.
        </p>
      </div>

      {products.map((product) => {
        const stockAvailable = getKioskCatalogStockAvailable(product);
        const maxQuantity = stockAvailable ?? 99;
        const unitPrice = getKioskPublicUnitPrice(product, isCommunityMember);
        const communityLabel = getKioskCommunityPriceLabel(
          product.community_price,
          isCommunityMember,
        );

        return (
          <PublicCard key={product.id} padding="md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="public-heading text-base font-bold">
                  {product.product_name}
                </h4>
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
                  {communityLabel ? (
                    <>
                      <StatusBadge tone="community">
                        Comunidad: {communityLabel}
                      </StatusBadge>
                      {product.price !== unitPrice ? (
                        <StatusBadge tone="neutral">
                          Público: {formatKioskMoney(product.price)}
                        </StatusBadge>
                      ) : null}
                    </>
                  ) : (
                    <StatusBadge tone="primary">
                      {formatKioskMoney(product.price)}
                    </StatusBadge>
                  )}
                  {stockAvailable != null ? (
                    <StatusBadge tone="neutral">
                      Disponibles: {formatKioskStockRemaining(product)}
                    </StatusBadge>
                  ) : null}
                </div>
              </div>

              <div className="shrink-0">
                <label
                  htmlFor={`inline_kiosk_qty_${product.id}`}
                  className="mb-2 block text-xs uppercase tracking-wider public-text-soft"
                >
                  Cantidad
                  {stockAvailable != null ? ` (máx. ${maxQuantity})` : ""}
                </label>
                <input
                  id={`inline_kiosk_qty_${product.id}`}
                  type="number"
                  min={0}
                  max={stockAvailable ?? undefined}
                  value={value[product.id] ?? 0}
                  disabled={disabled}
                  onChange={(changeEvent) =>
                    setQuantity(
                      product.id,
                      changeEvent.target.value,
                      stockAvailable,
                    )
                  }
                  className="public-input sm:w-28"
                />
              </div>
            </div>
          </PublicCard>
        );
      })}

      {lines.length > 0 ? (
        <div className="public-summary-box">
          <h4 className="text-sm font-semibold uppercase tracking-wider public-text-soft">
            Subtotal consumisiones
          </h4>
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
          <p className="mt-4 flex justify-between border-t pt-4 font-bold public-heading" style={{ borderColor: "var(--public-border)" }}>
            <span>Total consumisiones</span>
            <span>{formatKioskMoney(total)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
