"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import {
  toggleEventKioskProductAvailabilityAction,
  updateEventKioskProductAction,
} from "@/lib/kiosk/actions";
import type { EventKioskProductWithCatalog } from "@/lib/kiosk/types";
import {
  formatKioskMoney,
  formatKioskStockRemaining,
  getEventKioskProductStatus,
  getEventKioskProductStatusLabel,
  validateKioskPrice,
  validateKioskStockTotal,
} from "@/lib/kiosk/utils";
import { adminInputClassName } from "@/lib/utils/adminFormStyles";
import { cn } from "@/lib/utils/cn";

type EventKioskProductCardProps = {
  product: EventKioskProductWithCatalog;
};

export function EventKioskProductCard({ product }: EventKioskProductCardProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = getEventKioskProductStatus(product);
  const revenue = product.price * product.stock_sold;

  async function handleToggleAvailability() {
    setLoading(true);
    setError(null);

    const result = await toggleEventKioskProductAvailabilityAction(
      product.id,
      !product.is_available,
    );

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo cambiar la disponibilidad.");
      return;
    }

    router.refresh();
  }

  return (
    <>
      <Card padding="sm" className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-white">{product.product_name}</h3>
              <StatusBadge status={status} />
              {product.product_category ? (
                <span className="text-[11px] text-zinc-500">
                  {product.product_category}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => setEditOpen(true)}
            >
              Editar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={handleToggleAvailability}
            >
              {product.is_available ? "Pausar" : "Activar"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Precio" value={formatKioskMoney(product.price)} />
          <Stat
            label="Stock"
            value={product.stock_total != null ? String(product.stock_total) : "∞"}
          />
          <Stat label="Vendido" value={String(product.stock_sold)} />
          <Stat label="Restante" value={formatKioskStockRemaining(product)} />
          <Stat label="Recaudado est." value={formatKioskMoney(revenue)} />
          <Stat label="Orden" value={String(product.sort_order)} />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        ) : null}
      </Card>

      <EditEventKioskProductModal
        product={product}
        open={editOpen}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

function EditEventKioskProductModal({
  product,
  open,
  onClose,
}: {
  product: EventKioskProductWithCatalog;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [price, setPrice] = useState(String(product.price));
  const [stockTotal, setStockTotal] = useState(
    product.stock_total != null ? String(product.stock_total) : "",
  );
  const [sortOrder, setSortOrder] = useState(String(product.sort_order));
  const [isAvailable, setIsAvailable] = useState(product.is_available);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const parsedPrice = Number(price);
    const priceError = validateKioskPrice(parsedPrice);
    if (priceError) {
      setLoading(false);
      setError(priceError);
      return;
    }

    const parsedStock =
      stockTotal.trim() === "" ? null : Number.parseInt(stockTotal, 10);
    const stockError = validateKioskStockTotal(parsedStock);
    if (stockError) {
      setLoading(false);
      setError(stockError);
      return;
    }

    if (
      parsedStock != null &&
      parsedStock < product.stock_sold
    ) {
      setLoading(false);
      setError("El stock total no puede ser menor a lo ya vendido.");
      return;
    }

    const parsedSort = Number.parseInt(sortOrder, 10);
    if (!Number.isInteger(parsedSort) || parsedSort < 0) {
      setLoading(false);
      setError("El orden debe ser un entero mayor o igual a 0.");
      return;
    }

    const result = await updateEventKioskProductAction(product.id, {
      price: parsedPrice,
      stock_total: parsedStock,
      is_available: isAvailable,
      sort_order: parsedSort,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo guardar.");
      return;
    }

    onClose();
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar: ${product.product_name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Precio">
          <input
            type="number"
            min={0}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={adminInputClassName}
            required
          />
        </Field>

        <Field label="Stock total (vacío = ilimitado)">
          <input
            type="number"
            min={product.stock_sold}
            step={1}
            value={stockTotal}
            onChange={(e) => setStockTotal(e.target.value)}
            className={adminInputClassName}
            placeholder="Ilimitado"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Vendido actual: {product.stock_sold}
          </p>
        </Field>

        <Field label="Orden">
          <input
            type="number"
            min={0}
            step={1}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className={adminInputClassName}
            required
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="size-4 rounded border-white/20 bg-zinc-900"
          />
          Disponible para venta
        </label>

        {error ? (
          <p className="text-sm text-red-300">{error}</p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="submit" size="sm" disabled={loading}>
            Guardar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof getEventKioskProductStatus> }) {
  const label = getEventKioskProductStatusLabel(status);

  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px]",
        status === "available" && "bg-emerald-400/15 text-emerald-300",
        status === "paused" && "bg-zinc-500/20 text-zinc-400",
        status === "sold_out" && "bg-amber-400/15 text-amber-200",
      )}
    >
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 font-semibold text-zinc-100">{value}</p>
    </div>
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
