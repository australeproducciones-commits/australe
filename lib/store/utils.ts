import type { StoreProduct, StoreProductVariant } from "@/lib/store/types";

export function getStoreStockAvailable(
  product: Pick<StoreProduct, "track_stock" | "stock_total" | "stock_reserved">,
  variant?: Pick<StoreProductVariant, "stock_total" | "stock_reserved"> | null,
): number | null {
  if (!product.track_stock) {
    return null;
  }

  if (variant) {
    return Math.max(0, variant.stock_total - variant.stock_reserved);
  }

  return Math.max(0, product.stock_total - product.stock_reserved);
}

export function isStoreProductPubliclyAvailable(
  product: Pick<
    StoreProduct,
    "is_active" | "status" | "available_from" | "available_until"
  >,
  now = new Date(),
): boolean {
  if (!product.is_active || product.status !== "active") {
    return false;
  }

  if (product.available_from && new Date(product.available_from) > now) {
    return false;
  }

  if (product.available_until && new Date(product.available_until) < now) {
    return false;
  }

  return true;
}

export function resolveStoreUnitPrice(
  product: Pick<StoreProduct, "public_price" | "community_price">,
  variant?: Pick<
    StoreProductVariant,
    "price_override" | "community_price_override"
  > | null,
  eventOverrides?: {
    event_price_override?: number | null;
    event_community_price_override?: number | null;
  } | null,
  community = false,
): number {
  if (community) {
    return (
      eventOverrides?.event_community_price_override ??
      variant?.community_price_override ??
      product.community_price ??
      eventOverrides?.event_price_override ??
      variant?.price_override ??
      product.public_price
    );
  }

  return (
    eventOverrides?.event_price_override ??
    variant?.price_override ??
    product.public_price
  );
}

export function formatStorePrice(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function mapCreateStoreOrderRpcError(message: string): string {
  if (message.includes("stock insuficiente")) {
    return "No hay stock suficiente para uno de los productos.";
  }
  if (message.includes("max_per_order")) {
    return "Superaste la cantidad máxima permitida por pedido.";
  }
  if (message.includes("exclusivo comunidad")) {
    return "Este producto es exclusivo para miembros de la comunidad.";
  }
  if (message.includes("contacto requerido")) {
    return "Ingresá un email o teléfono de contacto.";
  }
  if (message.includes("no disponible en tienda general")) {
    return "Este producto no está disponible en la tienda general.";
  }
  if (message.includes("no asociado al evento")) {
    return "Este producto no está disponible para este evento.";
  }
  if (message.includes("evento no disponible para comercio")) {
    return "El evento ya no está disponible para compras de merchandising.";
  }
  if (message.includes("merchandising no habilitado")) {
    return "Las ventas de merchandising no están habilitadas para este evento.";
  }
  if (message.includes("no disponible")) {
    return "Uno de los productos ya no está disponible.";
  }
  return "No se pudo crear el pedido. Intentá de nuevo.";
}

export const STORE_CART_STORAGE_KEY = "australe-store-cart-v1";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isStoreUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export const STORE_RESERVATION_MINUTES = 30;

export const STORE_LOW_STOCK_THRESHOLD = 5;

export const STORE_CATEGORIES = [
  { value: "general", label: "General" },
  { value: "remeras", label: "Remeras" },
  { value: "buzos", label: "Buzos" },
  { value: "gorras", label: "Gorras" },
  { value: "accesorios", label: "Accesorios" },
  { value: "posters", label: "Posters" },
  { value: "packs", label: "Packs" },
  { value: "ediciones", label: "Ediciones especiales" },
] as const;
