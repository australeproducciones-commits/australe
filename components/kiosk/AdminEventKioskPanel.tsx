"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CreateKioskManualOrderModal } from "@/components/kiosk/CreateKioskManualOrderModal";
import { EventKioskProductCard } from "@/components/kiosk/EventKioskProductCard";
import { KioskOrdersTable } from "@/components/kiosk/KioskOrdersTable";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import type { Event } from "@/lib/events/types";
import {
  addProductToEventKioskAction,
  createKioskProductAction,
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
  getSellableEventKioskProducts,
  validateKioskPrice,
  validateKioskStockTotal,
} from "@/lib/kiosk/utils";
import {
  adminInputClassName,
  adminSelectClassName,
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
    () => getSellableEventKioskProducts(eventProducts),
    [eventProducts],
  );

  const presaleEnabled = settings?.presale_enabled ?? false;
  const manualSalesEnabled = settings?.manual_sales_enabled ?? true;

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
}: {
  eventId: string;
  presaleEnabled: boolean;
  manualSalesEnabled: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveSettings(next: {
    presale_enabled?: boolean;
    manual_sales_enabled?: boolean;
  }) {
    setLoading(true);
    setError(null);

    const result = await upsertEventKioskSettingsAction(eventId, {
      presale_enabled: next.presale_enabled ?? presaleEnabled,
      manual_sales_enabled: next.manual_sales_enabled ?? manualSalesEnabled,
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
            La preventa pública se habilitará en C.3. Este check deja preparado
            el evento.
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
            La venta manual se implementará en una etapa posterior.
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
  const [createOpen, setCreateOpen] = useState(false);

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
          <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            Nuevo producto maestro
          </Button>
          <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
            Agregar al evento
          </Button>
        </div>
      </div>

      {eventProducts.length === 0 ? (
        <Card padding="md" className="text-center">
          <p className="text-sm text-zinc-400">
            Todavía no hay productos en el kiosco de este evento.
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
        allProducts={products}
        nextSortOrder={eventProducts.length}
      />

      <CreateMasterProductModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setAddOpen(true);
        }}
      />
    </>
  );
}

function AddEventProductModal({
  open,
  onClose,
  eventId,
  products,
  allProducts,
  nextSortOrder,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  products: KioskProduct[];
  allProducts: KioskProduct[];
  nextSortOrder: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [stockTotal, setStockTotal] = useState("");
  const [sortOrder, setSortOrder] = useState(String(nextSortOrder));
  const [isAvailable, setIsAvailable] = useState(true);

  const selectedProduct = allProducts.find((item) => item.id === productId);

  function resetForm() {
    setProductId("");
    setPrice("");
    setStockTotal("");
    setSortOrder(String(nextSortOrder));
    setIsAvailable(true);
    setError(null);
  }

  function handleProductChange(nextId: string) {
    setProductId(nextId);
    const product = allProducts.find((item) => item.id === nextId);
    if (product?.default_price != null && !price) {
      setPrice(String(product.default_price));
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (!productId) {
      setLoading(false);
      setError("Seleccioná un producto.");
      return;
    }

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

    const parsedSort = Number.parseInt(sortOrder, 10);
    if (!Number.isInteger(parsedSort) || parsedSort < 0) {
      setLoading(false);
      setError("El orden debe ser un entero mayor o igual a 0.");
      return;
    }

    const result = await addProductToEventKioskAction(eventId, productId, {
      price: parsedPrice,
      stock_total: parsedStock,
      is_available: isAvailable,
      sort_order: parsedSort,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo agregar el producto.");
      return;
    }

    resetForm();
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="Agregar producto al evento">
      <form onSubmit={handleSubmit} className="space-y-4">
        {products.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No hay productos maestros disponibles. Creá uno nuevo o activá
            productos que aún no estén en este evento.
          </p>
        ) : (
          <Field label="Producto">
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className={adminSelectClassName}
              required
            >
              <option value="">Seleccionar…</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.category ? ` · ${product.category}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        {selectedProduct?.description ? (
          <p className="text-xs text-zinc-500">{selectedProduct.description}</p>
        ) : null}

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

        <Field label="Stock total (opcional)">
          <input
            type="number"
            min={0}
            step={1}
            value={stockTotal}
            onChange={(e) => setStockTotal(e.target.value)}
            className={adminInputClassName}
            placeholder="Ilimitado"
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

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="size-4 rounded border-white/20 bg-zinc-900"
          />
          Disponible
        </label>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={loading || products.length === 0}>
            Agregar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CreateMasterProductModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  function resetForm() {
    setName("");
    setDescription("");
    setCategory("");
    setDefaultPrice("");
    setImageUrl("");
    setIsActive(true);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setLoading(false);
      setError("El nombre es obligatorio.");
      return;
    }

    const parsedDefaultPrice =
      defaultPrice.trim() === "" ? null : Number(defaultPrice);
    if (parsedDefaultPrice != null) {
      const priceError = validateKioskPrice(parsedDefaultPrice);
      if (priceError) {
        setLoading(false);
        setError(priceError);
        return;
      }
    }

    const result = await createKioskProductAction({
      name: trimmedName,
      description: description.trim() || null,
      category: category.trim() || null,
      default_price: parsedDefaultPrice,
      image_url: imageUrl.trim() || null,
      is_active: isActive,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo crear el producto.");
      return;
    }

    resetForm();
    router.refresh();
    onCreated();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nuevo producto maestro">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={adminInputClassName}
            required
          />
        </Field>

        <Field label="Descripción (opcional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={adminInputClassName}
          />
        </Field>

        <Field label="Categoría (opcional)">
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={adminInputClassName}
            placeholder="Bebidas, combos…"
          />
        </Field>

        <Field label="Precio por defecto (opcional)">
          <input
            type="number"
            min={0}
            step="0.01"
            value={defaultPrice}
            onChange={(e) => setDefaultPrice(e.target.value)}
            className={adminInputClassName}
          />
        </Field>

        <Field label="Imagen URL (opcional)">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className={adminInputClassName}
            placeholder="https://…"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-white/20 bg-zinc-900"
          />
          Activo en catálogo maestro
        </label>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={loading}>
            Crear producto
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </form>
    </Modal>
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
