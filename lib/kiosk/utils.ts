import type {
  EventKioskProductWithCatalog,
  KioskOrder,
  KioskOrderPaymentStatus,
  KioskOrderPickupStatus,
  KioskOrderSource,
  PublicEventKioskProduct,
  PublicKioskReservationItemInput,
} from "@/lib/kiosk/types";
import { KIOSK_ORDER_PAYMENT_STATUS, KIOSK_ORDER_PICKUP_STATUS } from "@/lib/kiosk/types";
import {
  formatCommunityPriceLabel,
  hasCommunityPrice,
} from "@/lib/tickets/utils";

export type EventKioskProductStatus = "available" | "paused" | "sold_out";

export type EventKioskSummary = {
  totalProducts: number;
  activeProducts: number;
  soldUnits: number;
  estimatedRevenue: number;
};

export type KioskOrdersSummary = {
  totalOrders: number;
  paidOrders: number;
  pendingPaymentOrders: number;
  pendingPickupOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  paidRevenue: number;
  pendingRevenue: number;
};

export type KioskOrderFilter =
  | "all"
  | "pending_payment"
  | "paid"
  | "pending_pickup"
  | "ready"
  | "delivered"
  | "cancelled";

export const KIOSK_ORDER_FILTERS: { id: KioskOrderFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "pending_payment", label: "Pendientes de pago" },
  { id: "paid", label: "Pagadas" },
  { id: "pending_pickup", label: "Pendientes de entrega" },
  { id: "ready", label: "Listas" },
  { id: "delivered", label: "Entregadas" },
  { id: "cancelled", label: "Canceladas" },
];

export const KIOSK_PAYMENT_STATUS_LABELS: Record<KioskOrderPaymentStatus, string> =
  {
    pending: "Pendiente",
    paid: "Pagado",
    cancelled: "Cancelado",
    refunded: "Reintegrado",
  };

export const KIOSK_PICKUP_STATUS_LABELS: Record<KioskOrderPickupStatus, string> =
  {
    pending: "Pendiente",
    ready: "Listo para retirar",
    delivered: "Entregado",
    cancelled: "Cancelado",
  };

export const KIOSK_ORDER_SOURCE_LABELS: Record<KioskOrderSource, string> = {
  admin: "Admin",
  public: "Público",
  manual: "Manual",
};

export function formatKioskMoney(value: number | null | undefined): string {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getKioskPaymentStatusLabel(
  status: KioskOrderPaymentStatus | string,
): string {
  return (
    KIOSK_PAYMENT_STATUS_LABELS[status as KioskOrderPaymentStatus] ?? status
  );
}

export function getKioskPickupStatusLabel(
  status: KioskOrderPickupStatus | string,
): string {
  return KIOSK_PICKUP_STATUS_LABELS[status as KioskOrderPickupStatus] ?? status;
}

export function getKioskOrderSourceLabel(
  source: KioskOrderSource | string,
): string {
  return KIOSK_ORDER_SOURCE_LABELS[source as KioskOrderSource] ?? source;
}

export const PUBLIC_KIOSK_QUANTITY_NOT_ALLOWED =
  "La cantidad seleccionada no está permitida. Ajustá tu pedido e intentá nuevamente.";

export function exceedsKioskMaxPerOrder(
  maxPerOrder: number | null | undefined,
  quantity: number,
): boolean {
  return maxPerOrder != null && quantity > maxPerOrder;
}

export function getKioskPublicUnitPrice(
  product: Pick<PublicEventKioskProduct, "price" | "community_price">,
  isCommunityMember: boolean,
): number {
  if (
    isCommunityMember &&
    product.community_price != null
  ) {
    return product.community_price;
  }

  return product.price;
}

export function getKioskCommunityPriceLabel(
  communityPrice: number | null | undefined,
  isCommunityMember: boolean,
): string | null {
  if (!isCommunityMember || !hasCommunityPrice(communityPrice)) {
    return null;
  }

  return formatCommunityPriceLabel(communityPrice);
}

export function getKioskStockLabel(product: {
  stock_total: number | null;
  stock_sold: number;
  product_stock_on_hand?: number;
  product_stock_reserved?: number;
}): string {
  const available = getKioskStockAvailable(product);

  if (available != null) {
    return `${product.stock_sold} vendidas en evento · ${available} disponibles en catálogo`;
  }

  if (product.stock_total == null) {
    return `${product.stock_sold} vendidas · stock ilimitado`;
  }

  const remaining = Math.max(0, product.stock_total - product.stock_sold);
  return `${product.stock_sold} / ${product.stock_total} vendidas · ${remaining} disponibles`;
}

export function isKioskProductSoldOut(product: {
  stock_total: number | null;
  stock_sold: number;
  is_available: boolean;
  product_stock_on_hand?: number;
  product_stock_reserved?: number;
}): boolean {
  if (!product.is_available) {
    return true;
  }

  if (
    product.product_stock_on_hand != null &&
    product.product_stock_reserved != null
  ) {
    return (
      product.product_stock_on_hand - product.product_stock_reserved <= 0
    );
  }

  if (product.stock_total == null) {
    return false;
  }

  return product.stock_sold >= product.stock_total;
}

export function getKioskStockAvailable(product: {
  stock_total: number | null;
  stock_sold: number;
  product_stock_on_hand?: number;
  product_stock_reserved?: number;
}): number | null {
  if (
    product.product_stock_on_hand != null &&
    product.product_stock_reserved != null
  ) {
    return Math.max(
      0,
      product.product_stock_on_hand - product.product_stock_reserved,
    );
  }

  if (product.stock_total == null) {
    return null;
  }

  return Math.max(0, product.stock_total - product.stock_sold);
}

export function validateKioskPrice(price: number): string | null {
  if (!Number.isFinite(price) || price < 0) {
    return "El precio debe ser mayor o igual a 0.";
  }

  return null;
}

export function validateKioskStockTotal(
  stockTotal: number | null | undefined,
): string | null {
  if (stockTotal == null) {
    return null;
  }

  if (!Number.isInteger(stockTotal) || stockTotal < 0) {
    return "El stock debe ser un entero mayor o igual a 0, o dejarse vacío.";
  }

  return null;
}

export function validateKioskCommunityPrice(
  price: number | null | undefined,
): string | null {
  if (price == null) {
    return null;
  }

  return validateKioskPrice(price);
}

export function validateKioskMaxPerOrder(
  maxPerOrder: number | null | undefined,
): string | null {
  if (maxPerOrder == null) {
    return null;
  }

  if (!Number.isInteger(maxPerOrder) || maxPerOrder <= 0) {
    return "El límite por pedido debe ser un entero positivo o dejarse vacío.";
  }

  return null;
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseOptionalNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getEventKioskProductStatus(product: {
  stock_total: number | null;
  stock_sold: number;
  is_available: boolean;
  product_stock_on_hand?: number;
  product_stock_reserved?: number;
}): EventKioskProductStatus {
  if (!product.is_available) {
    return "paused";
  }

  if (isKioskProductSoldOut(product)) {
    return "sold_out";
  }

  return "available";
}

export function getEventKioskProductStatusLabel(
  status: EventKioskProductStatus,
): string {
  switch (status) {
    case "available":
      return "Disponible";
    case "paused":
      return "Pausado";
    case "sold_out":
      return "Agotado";
    default:
      return status;
  }
}

export function getEventKioskSummary(
  eventProducts: EventKioskProductWithCatalog[],
): EventKioskSummary {
  let activeProducts = 0;
  let soldUnits = 0;
  let estimatedRevenue = 0;

  for (const product of eventProducts) {
    if (
      product.is_available &&
      !isKioskProductSoldOut(product)
    ) {
      activeProducts += 1;
    }

    soldUnits += product.stock_sold;
    estimatedRevenue += product.price * product.stock_sold;
  }

  return {
    totalProducts: eventProducts.length,
    activeProducts,
    soldUnits,
    estimatedRevenue,
  };
}

export function isEventKioskProductSellable(
  product: EventKioskProductWithCatalog,
): boolean {
  return (
    product.is_available &&
    product.product_is_active &&
    !isKioskProductSoldOut(product)
  );
}

export function isEventKioskProductSellableForCashier(
  product: EventKioskProductWithCatalog,
): boolean {
  return (
    isEventKioskProductSellable(product) &&
    (product.cashier_sale_enabled ?? true)
  );
}

export function getSellableEventKioskProducts(
  eventProducts: EventKioskProductWithCatalog[],
): EventKioskProductWithCatalog[] {
  return eventProducts.filter(isEventKioskProductSellable);
}

export function getSellableEventKioskProductsForCashier(
  eventProducts: EventKioskProductWithCatalog[],
): EventKioskProductWithCatalog[] {
  return eventProducts.filter(isEventKioskProductSellableForCashier);
}

export function isKioskOrderCancelled(order: KioskOrder): boolean {
  return (
    order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.CANCELLED ||
    order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.CANCELLED
  );
}

export function isKioskOrderDelivered(order: KioskOrder): boolean {
  return order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.DELIVERED;
}

export function canMarkKioskOrderPaid(order: KioskOrder): boolean {
  return (
    order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PENDING &&
    order.pickup_status !== KIOSK_ORDER_PICKUP_STATUS.CANCELLED
  );
}

export function canMarkKioskOrderReady(order: KioskOrder): boolean {
  return (
    order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.PENDING &&
    !isKioskOrderCancelled(order)
  );
}

export function canMarkKioskOrderDelivered(order: KioskOrder): boolean {
  return (
    order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID &&
    (order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.PENDING ||
      order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.READY)
  );
}

export function canCancelKioskOrder(order: KioskOrder): boolean {
  return (
    !isKioskOrderDelivered(order) && !isKioskOrderCancelled(order)
  );
}

export function kioskOrderMatchesFilter(
  order: KioskOrder,
  filter: KioskOrderFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "pending_payment":
      return order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PENDING;
    case "paid":
      return order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID;
    case "pending_pickup":
      return (
        order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.PENDING &&
        !isKioskOrderCancelled(order)
      );
    case "ready":
      return order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.READY;
    case "delivered":
      return order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.DELIVERED;
    case "cancelled":
      return isKioskOrderCancelled(order);
    default:
      return true;
  }
}

export function kioskOrderMatchesSearch(
  order: KioskOrder,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const fields = [
    order.order_code,
    order.buyer_name,
    order.buyer_whatsapp,
    order.buyer_dni,
    order.buyer_email,
    order.ticket_id,
    order.id,
  ];

  return fields.some((field) => {
    if (!field) {
      return false;
    }
    return field.toLowerCase().includes(normalized);
  });
}

export function filterKioskOrders(
  orders: KioskOrder[],
  filter: KioskOrderFilter,
  searchQuery: string,
): KioskOrder[] {
  return orders.filter(
    (order) =>
      kioskOrderMatchesFilter(order, filter) &&
      kioskOrderMatchesSearch(order, searchQuery),
  );
}

export function countKioskOrdersByFilter(
  orders: KioskOrder[],
  filter: KioskOrderFilter,
): number {
  return orders.filter((order) => kioskOrderMatchesFilter(order, filter)).length;
}

export function getKioskOrdersSummary(orders: KioskOrder[]): KioskOrdersSummary {
  let paidOrders = 0;
  let pendingPaymentOrders = 0;
  let pendingPickupOrders = 0;
  let readyOrders = 0;
  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let paidRevenue = 0;
  let pendingRevenue = 0;

  for (const order of orders) {
    const amount = Number(order.total_amount) || 0;

    if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PAID) {
      paidOrders += 1;
      paidRevenue += amount;
    }

    if (order.payment_status === KIOSK_ORDER_PAYMENT_STATUS.PENDING) {
      pendingPaymentOrders += 1;
      pendingRevenue += amount;
    }

    if (
      order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.PENDING &&
      !isKioskOrderCancelled(order)
    ) {
      pendingPickupOrders += 1;
    }

    if (order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.READY) {
      readyOrders += 1;
    }

    if (order.pickup_status === KIOSK_ORDER_PICKUP_STATUS.DELIVERED) {
      deliveredOrders += 1;
    }

    if (isKioskOrderCancelled(order)) {
      cancelledOrders += 1;
    }
  }

  return {
    totalOrders: orders.length,
    paidOrders,
    pendingPaymentOrders,
    pendingPickupOrders,
    readyOrders,
    deliveredOrders,
    cancelledOrders,
    paidRevenue,
    pendingRevenue,
  };
}

export function mapManageKioskOrderRpcError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("usuario no autenticado")) {
    return "Tenés que iniciar sesión para realizar esta acción.";
  }
  if (normalized.includes("permiso denegado")) {
    return "No tenés permiso para gestionar órdenes.";
  }
  if (normalized.includes("evento no autorizado")) {
    return "No tenés acceso para operar órdenes de este evento.";
  }
  if (normalized.includes("orden no encontrada")) {
    return "Orden no encontrada.";
  }
  if (normalized.includes("debe estar pagada antes de entregar")) {
    return "No se puede entregar una orden pendiente de pago.";
  }
  if (normalized.includes("no se puede cancelar una orden ya entregada")) {
    return "No se puede cancelar una orden ya entregada.";
  }
  if (normalized.includes("está cancelada")) {
    return "Esta orden ya está cancelada.";
  }
  if (normalized.includes("no puede marcarse como lista")) {
    return "Esta orden no puede marcarse como lista.";
  }

  return "No se pudo actualizar la orden. Intentá de nuevo.";
}

export function mapManualKioskOrderRpcError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("usuario no autenticado")) {
    return "Tenés que iniciar sesión para registrar la venta.";
  }
  if (normalized.includes("permiso denegado")) {
    return "No tenés permiso para registrar ventas manuales.";
  }
  if (normalized.includes("evento no autorizado")) {
    return "No tenés acceso para operar en este evento.";
  }
  if (normalized.includes("comprador requerido")) {
    return "Ingresá el nombre del comprador.";
  }
  if (normalized.includes("venta manual deshabilitada")) {
    return "La venta manual está deshabilitada para este evento.";
  }
  if (normalized.includes("max_per_order_exceeded")) {
    return "La cantidad supera el límite permitido para uno de los productos.";
  }
  if (normalized.includes("stock insuficiente")) {
    return "No hay stock suficiente para uno de los productos.";
  }
  if (normalized.includes("producto no disponible")) {
    return "Uno de los productos ya no está disponible.";
  }
  if (normalized.includes("producto del catálogo inactivo")) {
    return "Uno de los productos del catálogo está inactivo.";
  }
  if (normalized.includes("items requeridos") || normalized.includes("cantidad inválida")) {
    return "Seleccioná al menos un producto con cantidad válida.";
  }
  if (normalized.includes("entrada no pertenece")) {
    return "La entrada indicada no pertenece a este evento.";
  }

  return "No se pudo registrar la venta. Intentá de nuevo.";
}

export function mapPublicKioskOrderRpcError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("usuario no autenticado")) {
    return "Iniciá sesión para acceder a la preventa.";
  }
  if (normalized.includes("comunidad requerida")) {
    return "La preventa de consumiciones es exclusiva para miembros de la comunidad.";
  }
  if (normalized.includes("comprador requerido")) {
    return "Ingresá tu nombre.";
  }
  if (normalized.includes("contacto requerido")) {
    return "Completá al menos WhatsApp, DNI o email.";
  }
  if (normalized.includes("preventa no habilitada")) {
    return "La preventa de consumisiones no está habilitada para este evento.";
  }
  if (normalized.includes("evento no publicado")) {
    return "Este evento no está disponible para reservas.";
  }
  if (normalized.includes("evento no encontrado")) {
    return "Evento no encontrado.";
  }
  if (normalized.includes("max_per_order_exceeded")) {
    return PUBLIC_KIOSK_QUANTITY_NOT_ALLOWED;
  }
  if (normalized.includes("stock insuficiente")) {
    return "Stock insuficiente. Actualizá la selección e intentá nuevamente.";
  }
  if (normalized.includes("entrada no pertenece al evento")) {
    return "No se pudo vincular la reserva de consumisiones con la entrada.";
  }
  if (normalized.includes("producto no disponible")) {
    return "Uno de los productos ya no está disponible.";
  }
  if (normalized.includes("producto del catálogo inactivo")) {
    return "Uno de los productos ya no está disponible.";
  }
  if (normalized.includes("producto no pertenece al evento")) {
    return "Hay un producto inválido en la reserva.";
  }
  if (
    normalized.includes("items requeridos") ||
    normalized.includes("cantidad inválida") ||
    normalized.includes("item inválido")
  ) {
    return "Seleccioná al menos un producto con cantidad válida.";
  }

  return "No se pudo confirmar la reserva. Intentá de nuevo.";
}

export function parseKioskReservationItemsFromFormData(
  formData: FormData,
): PublicKioskReservationItemInput[] {
  const raw = String(formData.get("kiosk_items") ?? "").trim();

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    const items: PublicKioskReservationItemInput[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }

      const record = item as Record<string, unknown>;
      const eventKioskProductId = String(record.eventKioskProductId ?? "").trim();
      const quantity = Number.parseInt(String(record.quantity ?? "0"), 10);

      if (!eventKioskProductId || !Number.isInteger(quantity) || quantity <= 0) {
        continue;
      }

      items.push({
        eventKioskProductId,
        quantity,
        productName:
          typeof record.productName === "string" ? record.productName : undefined,
        unitPrice:
          typeof record.unitPrice === "number" ? record.unitPrice : undefined,
      });
    }

    return items;
  } catch {
    return [];
  }
}

export function formatKioskStockRemaining(product: {
  stock_total: number | null;
  stock_sold: number;
  product_stock_on_hand?: number;
  product_stock_reserved?: number;
}): string {
  const available = getKioskStockAvailable(product);

  if (available != null) {
    return String(available);
  }

  if (product.stock_total == null) {
    return "Ilimitado";
  }

  return String(Math.max(0, product.stock_total - product.stock_sold));
}
