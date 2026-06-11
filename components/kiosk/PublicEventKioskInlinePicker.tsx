"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import type { PublicEventKioskProduct } from "@/lib/kiosk/types";
import {
  formatKioskMoney,
  formatKioskStockRemaining,
  getKioskStockAvailable,
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
};

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-purple-400 focus:outline-none";

export function buildPublicKioskPickerLines(
  products: PublicEventKioskProduct[],
  value: Record<string, number>,
): PublicKioskPickerLine[] {
  return products
    .map((product) => {
      const quantity = value[product.id] ?? 0;
      if (quantity <= 0) {
        return null;
      }

      return {
        product,
        quantity,
        subtotal: product.price * quantity,
      };
    })
    .filter((line): line is PublicKioskPickerLine => line != null);
}

export function PublicEventKioskInlinePicker({
  products,
  value,
  onChange,
  disabled = false,
}: PublicEventKioskInlinePickerProps) {
  const lines = useMemo(
    () => buildPublicKioskPickerLines(products, value),
    [products, value],
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
        <h3 className="text-lg font-bold text-white">Sumar consumisiones</h3>
        <p className="mt-1 text-sm text-zinc-400">
          Las consumisiones quedan reservadas para retirar el día del evento.
          Es opcional.
        </p>
      </div>

      {products.map((product) => {
        const stockAvailable = getKioskStockAvailable(product);
        const maxQuantity = stockAvailable ?? 99;

        return (
          <Card key={product.id} padding="md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-white">
                  {product.product_name}
                </h4>
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
                  htmlFor={`inline_kiosk_qty_${product.id}`}
                  className="mb-2 block text-xs uppercase tracking-wider text-zinc-400"
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
                  className={`${inputClassName} sm:w-28`}
                />
              </div>
            </div>
          </Card>
        );
      })}

      {lines.length > 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Subtotal consumisiones
          </h4>
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
          <p className="mt-4 flex justify-between border-t border-white/10 pt-4 font-bold text-white">
            <span>Total consumisiones</span>
            <span>{formatKioskMoney(total)}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
