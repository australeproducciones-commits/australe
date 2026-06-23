"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateKioskManualOrderModal } from "@/components/kiosk/CreateKioskManualOrderModal";
import { EventKioskProductCard } from "@/components/kiosk/EventKioskProductCard";
import { KioskOrdersTable } from "@/components/kiosk/KioskOrdersTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ROUTES } from "@/lib/constants/routes";
import type { Event } from "@/lib/events/types";
import {
  addProductToEventKioskAction,
  upsertEventKioskSettingsAction,
} from "@/lib/kiosk/actions";
import type {
  EventKioskProductWithCatalog,
  EventKioskSettings,
  KioskOrder,
  KioskOrderItem,
  KioskProduct,
} from "@/lib/kiosk/types";
import {
  formatKioskMoney,
  getEventKioskSummary,
  getSellableEventKioskProductsForCashier,
  validateKioskCommunityPrice,
  validateKioskMaxPerOrder,
  validateKioskPrice,
} from "@/lib/kiosk/utils";
import {
  adminInputClassName,
} from "@/lib/utils/adminFormStyles";
import { cn } from "@/lib/utils/cn";

type AdminEventKioskPanelProps = {
  event: Event;
  settings: EventKioskSettings | null;
  products: KioskProduct[];
  eventProducts: EventKioskProductWithCatalog[];
  orders: KioskOrder[];
  orderItems: KioskOrderItem[];
};

export function AdminEventKioskPanel({
  event,
  settings,
  products,
  eventProducts,
  orders,
  orderItems,
}: AdminEventKioskPanelProps) {
  const [manualSaleOpen, setManualSaleOpen] = useState(false);

  const summary = useMemo(
    () => getEventKioskSummary(eventProducts),
    [eventProducts],
  );
  const sellableProducts = useMemo(
    () => getSellableEventKioskProductsForCashier(eventProducts),
    [eventProducts],
  );

  const presaleEnabled = settings?.presale_enabled ?? false;
  const manualSalesEnabled = settings?.manual_sales_enabled ?? true;
  const qrSaleEnabled = settings?.qr_sale_enabled ?? true;
  const showPriceList = settings?.show_price_list ?? true;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">
          Operación de kiosco para {event.name}
        </p>
        <Button
          type="button"
          size="sm"
          disabled={!manualSalesEnabled}
          onClick={() => setManualSaleOpen(true)}
        >
          Nueva venta manual
        </Button>
      </div>

      {!manualSalesEnabled ? (
        <p className="text-xs text-amber-200">
          La venta manual está deshabilitada. Activá el check en configuración
          para registrar ventas.
        </p>
      ) : null}
      <HeaderBadges
        presaleEnabled={presaleEnabled}
        manualSalesEnabled={manualSalesEnabled}
        activeProducts={summary.activeProducts}
        estimatedRevenue={summary.estimatedRevenue}
      />

      <SummaryStrip summary={summary} />

      <KioskSettingsCard
        eventId={event.id}
        presaleEnabled={presaleEnabled}
        manualSalesEnabled={manualSalesEnabled}
        qrSaleEnabled={qrSaleEnabled}
        showPriceList={showPriceList}
      />

      <EventProductsSection
        eventId={event.id}
        eventProducts={eventProducts}
        products={products}
      />

      <KioskOrdersTable
        eventId={event.id}
        orders={orders}
        orderItems={orderItems}
      />

      <CreateKioskManualOrderModal
        open={manualSaleOpen}
        onClose={() => setManualSaleOpen(false)}
        eventId={event.id}
        sellableProducts={sellableProducts}
      />
    </div>
  );
}

function HeaderBadges({
  presaleEnabled,
  manualSalesEnabled,
  activeProducts,
  estimatedRevenue,
}: {
  presaleEnabled: boolean;
  manualSalesEnabled: boolean;
  activeProducts: number;
  estimatedRevenue: number;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge
        tone={presaleEnabled ? "emerald" : "neutral"}
        label={
          presaleEnabled ? "Preventa habilitada" : "Preventa deshabilitada"
        }
      />
      <Badge
        tone={manualSalesEnabled ? "sky" : "neutral"}
        label={
          manualSalesEnabled
            ? "Venta manual habilitada"
            : "Venta manual deshabilitada"
        }
      />
      <Badge tone="purple" label={`Productos activos: ${activeProducts}`} />
      <Badge
        tone="amber"
        label={`Recaudado est.: ${formatKioskMoney(estimatedRevenue)}`}
      />
    </div>
  );
}

function SummaryStrip({
  summary,
}: {
  summary: ReturnType<typeof getEventKioskSummary>;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <MiniStat label="Productos" value={String(summary.totalProducts)} />
      <MiniStat label="Activos" value={String(summary.activeProducts)} />
      <MiniStat label="Unidades vendidas" value={String(summary.soldUnits)} />
      <MiniStat
        label="Recaudado est."
        value={formatKioskMoney(summary.estimatedRevenue)}
      />
    </div>
  );
}

function KioskSettingsCard({
  eventId,
  presaleEnabled,
  manualSalesEnabled,
  qrSaleEnabled,
  showPriceList,
}: {
  eventId: string;
  presaleEnabled: boolean;
  manualSalesEnabled: boolean;
  qrSaleEnabled: boolean;
  showPriceList: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings(next: {
    presale_enabled?: boolean;
    manual_sales_enabled?: boolean;
    qr_sale_enabled?: boolean;
    show_price_list?: boolean;
  }) {
    setLoading(true);
    setError(null);

    const result = await upsertEventKioskSettingsAction(eventId, {
      presale_enabled: next.presale_enabled ?? presaleEnabled,
      manual_sales_enabled: next.manual_sales_enabled ?? manualSalesEnabled,
      qr_sale_enabled: next.qr_sale_enabled ?? qrSaleEnabled,
      show_price_list: next.show_price_list ?? showPriceList,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo guardar la configuración.");
      return;
    }

    router.refresh();
  }

  return (
    <Card padding="sm" className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
        Configuración
      </h2>

      <label className="flex items-start gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={presaleEnabled}
          disabled={loading}
          onChange={(e) =>
            saveSettings({ presale_enabled: e.target.checked })
          }
          className="mt-0.5 size-4 rounded border-white/20 bg-zinc-900"
        />
        <span>
          Habilitar preventa de consumisiones
          <span className="mt-0.5 block text-xs text-zinc-500">
            Permite reservas públicas y consumisiones junto con entradas.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={manualSalesEnabled}
          disabled={loading}
          onChange={(e) =>
            saveSettings({ manual_sales_enabled: e.target.checked })
          }
          className="mt-0.5 size-4 rounded border-white/20 bg-zinc-900"
        />
        <span>
          Habilitar venta manual en admin/caja
          <span className="mt-0.5 block text-xs text-zinc-500">
            Permite registrar ventas desde el panel o la caja.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={qrSaleEnabled}
          disabled={loading}
          onChange={(e) =>
            saveSettings({ qr_sale_enabled: e.target.checked })
          }
          className="mt-0.5 size-4 rounded border-white/20 bg-zinc-900"
        />
        <span>
          Mostrar consumisiones en QR / lista de precios
          <span className="mt-0.5 block text-xs text-zinc-500">
            Solo productos con canal QR habilitado aparecen en esas vistas.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={showPriceList}
          disabled={loading}
          onChange={(e) =>
            saveSettings({ show_price_list: e.target.checked })
          }
          className="mt-0.5 size-4 rounded border-white/20 bg-zinc-900"
        />
        <span>
          Publicar lista de precios de consumisiones
          <span className="mt-0.5 block text-xs text-zinc-500">
            Controla si la página de lista de precios del evento está activa.
          </span>
        </span>
      </label>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </Card>
  );
}

function EventProductsSection({
  eventId,
  eventProducts,
  products,
}: {
  eventId: string;
  eventProducts: EventKioskProductWithCatalog[];
  products: KioskProduct[];
}) {
  const [addOpen, setAddOpen] = useState(false);

  const linkedProductIds = new Set(eventProducts.map((item) => item.product_id));
  const availableProducts = products.filter(
    (product) => product.is_active && !linkedProductIds.has(product.id),
  );

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-white">
          Productos del kiosco ({eventProducts.length})
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            href={ROUTES.adminProductos}
          >
            Ir al catálogo global
          </Button>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Agregar al evento
          </Button>
        </div>
      </div>

      {eventProducts.length === 0 ? (
        <Card padding="md" className="text-center">
          <p className="text-sm text-zinc-400">
            Todavía no hay productos en el kiosco de este evento. Creá o activá
            productos en el{" "}
            <Link
              href={ROUTES.adminProductos}
              className="text-sky-300 underline-offset-2 hover:underline"
            >
              catálogo global
            </Link>{" "}
            y agregalos acá con precio y canales de venta.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {eventProducts.map((product) => (
            <EventKioskProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <AddEventProductModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        eventId={eventId}
        products={availableProducts}
        nextSortOrder={eventProducts.length}
      />
    </>
  );
}

function AddEventProductModal({
  open,
  onClose,
  eventId,
  products,
  nextSortOrder,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  products: KioskProduct[];
  nextSortOrder: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [communityPrice, setCommunityPrice] = useState("");
  const [maxPerOrder, setMaxPerOrder] = useState("");
  const [sortOrder, setSortOrder] = useState(String(nextSortOrder));
  const [isAvailable, setIsAvailable] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [presaleEnabled, setPresaleEnabled] = useState(true);
  const [qrSaleEnabled, setQrSaleEnabled] = useState(true);
  const [cashierSaleEnabled, setCashierSaleEnabled] = useState(true);

  const selectedProducts = products.filter((item) =>
    selectedProductIds.includes(item.id),
  );

  function resetForm() {
    setSelectedProductIds([]);
    setPrice("");
    setCommunityPrice("");
    setMaxPerOrder("");
    setSortOrder(String(nextSortOrder));
    setIsAvailable(true);
    setIsVisible(true);
    setPresaleEnabled(true);
    setQrSaleEnabled(true);
    setCashierSaleEnabled(true);
    setError(null);
  }

  function toggleProductSelection(product: KioskProduct) {
    setSelectedProductIds((current) => {
      const isSelected = current.includes(product.id);

      if (isSelected) {
        return current.filter((id) => id !== product.id);
      }

      if (!price && product.default_price != null) {
        setPrice(String(product.default_price));
      }

      return [...current, product.id];
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (selectedProductIds.length === 0) {
      setLoading(false);
      setError("Seleccioná al menos un producto.");
      return;
    }

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

    let sortIndex = parsedSort;

    for (const productId of selectedProductIds) {
      const result = await addProductToEventKioskAction(eventId, productId, {
        price: parsedPrice,
        community_price: parsedCommunityPrice,
        is_available: isAvailable,
        is_visible: isVisible,
        presale_enabled: presaleEnabled,
        qr_sale_enabled: qrSaleEnabled,
        cashier_sale_enabled: cashierSaleEnabled,
        max_per_order: parsedMaxPerOrder,
        sort_order: sortIndex,
      });

      if (!result.success) {
        setLoading(false);
        setError(result.error ?? "No se pudo agregar uno de los productos.");
        return;
      }

      sortIndex += 1;
    }

    setLoading(false);
    resetForm();
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar productos al evento">
      <form onSubmit={handleSubmit} className="space-y-4">
        {products.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No hay productos disponibles en el catálogo global.{" "}
            <Link
              href={ROUTES.adminProductos}
              className="text-sky-300 underline-offset-2 hover:underline"
            >
              Creá productos en /admin/productos
            </Link>{" "}
            y volvé a agregar al evento.
          </p>
        ) : (
          <Field label="Productos del catálogo">
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/10 p-3">
              {products.map((product) => {
                const available = Math.max(
                  0,
                  product.stock_on_hand - product.stock_reserved,
                );
                const checked = selectedProductIds.includes(product.id);

                return (
                  <label
                    key={product.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProductSelection(product)}
                      className="mt-0.5 size-4 rounded border-white/20 bg-zinc-900"
                    />
                    <span className="min-w-0 flex-1 text-sm text-zinc-200">
                      <span className="font-medium text-white">{product.name}</span>
                      {product.category ? (
                        <span className="text-zinc-500"> · {product.category}</span>
                      ) : null}
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        Disponible en catálogo: {available}
                        {product.sku ? ` · SKU ${product.sku}` : ""}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {selectedProducts.length > 0 ? (
              <p className="mt-2 text-xs text-zinc-500">
                {selectedProducts.length} producto
                {selectedProducts.length === 1 ? "" : "s"} seleccionado
                {selectedProducts.length === 1 ? "" : "s"}.
              </p>
            ) : null}
          </Field>
        )}

        {products.length > 0 ? (
          <>
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

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={loading || products.length === 0 || selectedProductIds.length === 0}
          >
            {selectedProductIds.length > 1
              ? `Agregar ${selectedProductIds.length} productos`
              : "Agregar"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
          </>
        ) : null}
      </form>
    </Modal>
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

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "emerald" | "sky" | "purple" | "amber" | "neutral";
}) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium",
        tone === "emerald" && "bg-emerald-400/15 text-emerald-200",
        tone === "sky" && "bg-sky-400/15 text-sky-200",
        tone === "purple" && "bg-purple-400/15 text-purple-200",
        tone === "amber" && "bg-amber-400/15 text-amber-200",
        tone === "neutral" && "bg-white/10 text-zinc-400",
      )}
    >
      {label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
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
