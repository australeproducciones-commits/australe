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
  getKioskCatalogStockAvailable,
  validateKioskCommunityPrice,
  validateKioskMaxPerOrder,
  validateKioskPrice,
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
  const catalogAvailable = getKioskCatalogStockAvailable(product);

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
            label="Precio comunidad"
            value={
              product.community_price != null
                ? formatKioskMoney(product.community_price)
                : "—"
            }
          />
          <Stat
            label="Stock catálogo"
            value={formatKioskStockRemaining(product)}
          />
          <Stat
            label="Reservado catálogo"
            value={
              product.product_stock_reserved != null
                ? String(product.product_stock_reserved)
                : "—"
            }
          />
          <Stat label="Vendido evento" value={String(product.stock_sold)} />
          <Stat label="Recaudado est." value={formatKioskMoney(revenue)} />
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
          <ChannelBadge label="Visible" active={product.is_visible} />
          <ChannelBadge label="Preventa" active={product.presale_enabled} />
          <ChannelBadge label="QR" active={product.qr_sale_enabled} />
          <ChannelBadge label="Caja" active={product.cashier_sale_enabled} />
          {product.max_per_order != null ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5">
              Máx. {product.max_per_order} / pedido
            </span>
          ) : null}
          {catalogAvailable != null && catalogAvailable <= 0 ? (
            <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-200">
              Sin stock en catálogo
            </span>
          ) : null}
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
  const [communityPrice, setCommunityPrice] = useState(
    product.community_price != null ? String(product.community_price) : "",
  );
  const [maxPerOrder, setMaxPerOrder] = useState(
    product.max_per_order != null ? String(product.max_per_order) : "",
  );
  const [sortOrder, setSortOrder] = useState(String(product.sort_order));
  const [isAvailable, setIsAvailable] = useState(product.is_available);
  const [isVisible, setIsVisible] = useState(product.is_visible);
  const [presaleEnabled, setPresaleEnabled] = useState(product.presale_enabled);
  const [qrSaleEnabled, setQrSaleEnabled] = useState(product.qr_sale_enabled);
  const [cashierSaleEnabled, setCashierSaleEnabled] = useState(
    product.cashier_sale_enabled,
  );

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

    const parsedCommunityPrice =
      communityPrice.trim() === "" ? null : Number(communityPrice);
    const communityPriceError = validateKioskCommunityPrice(parsedCommunityPrice);
    if (communityPriceError) {
      setLoading(false);
      setError(communityPriceError);
      return;
    }

    const parsedMaxPerOrder =
      maxPerOrder.trim() === "" ? null : Number.parseInt(maxPerOrder, 10);
    const maxPerOrderError = validateKioskMaxPerOrder(parsedMaxPerOrder);
    if (maxPerOrderError) {
      setLoading(false);
      setError(maxPerOrderError);
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
      community_price: parsedCommunityPrice,
      is_available: isAvailable,
      is_visible: isVisible,
      presale_enabled: presaleEnabled,
      qr_sale_enabled: qrSaleEnabled,
      cashier_sale_enabled: cashierSaleEnabled,
      max_per_order: parsedMaxPerOrder,
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
        <p className="text-xs text-zinc-500">
          Stock disponible en catálogo: {formatKioskStockRemaining(product)}.
          Ajustalo desde /admin/productos.
        </p>

        <Field label="Precio general">
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

        <Field label="Precio comunidad (opcional)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={communityPrice}
            onChange={(e) => setCommunityPrice(e.target.value)}
            className={adminInputClassName}
            placeholder="Sin precio especial"
          />
        </Field>

        <Field label="Límite por pedido (opcional)">
          <input
            type="number"
            min={1}
            step={1}
            value={maxPerOrder}
            onChange={(e) => setMaxPerOrder(e.target.value)}
            className={adminInputClassName}
            placeholder="Sin límite"
          />
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

        <div className="space-y-2 rounded-xl border border-white/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Canales y visibilidad
          </p>
          <CheckboxField
            label="Disponible para venta"
            checked={isAvailable}
            onChange={setIsAvailable}
          />
          <CheckboxField
            label="Visible en preventa pública"
            checked={isVisible}
            onChange={setIsVisible}
          />
          <CheckboxField
            label="Preventa web"
            checked={presaleEnabled}
            onChange={setPresaleEnabled}
          />
          <CheckboxField
            label="QR / lista de precios"
            checked={qrSaleEnabled}
            onChange={setQrSaleEnabled}
          />
          <CheckboxField
            label="Caja / venta manual"
            checked={cashierSaleEnabled}
            onChange={setCashierSaleEnabled}
          />
        </div>

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

function ChannelBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5",
        active ? "bg-emerald-400/10 text-emerald-200" : "bg-white/5 text-zinc-500",
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

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-white/20 bg-zinc-900"
      />
      {label}
    </label>
  );
}
