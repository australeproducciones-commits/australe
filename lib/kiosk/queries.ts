import { requireAdminPage } from "@/lib/events/queries";
import type {
  EventKioskProductWithCatalog,
  EventKioskSettings,
  KioskOrder,
  KioskOrderItem,
  KioskProduct,
  PublicEventKioskData,
  PublicEventKioskProduct,
} from "@/lib/kiosk/types";
import { isKioskProductSoldOut } from "@/lib/kiosk/utils";
import { createClient } from "@/lib/supabase/server";

const KIOSK_PRODUCT_COLUMNS =
  "id, name, slug, description, image_url, default_price, category, is_active, created_at, updated_at";

const EVENT_KIOSK_SETTINGS_COLUMNS =
  "event_id, presale_enabled, manual_sales_enabled, notes, created_at, updated_at";

const EVENT_KIOSK_PRODUCT_COLUMNS =
  "id, event_id, product_id, price, stock_total, stock_sold, is_available, sort_order, created_at, updated_at";

const KIOSK_ORDER_COLUMNS =
  "id, event_id, buyer_name, buyer_whatsapp, buyer_dni, buyer_email, ticket_id, order_code, source, payment_status, pickup_status, total_amount, paid_at, delivered_at, notes, created_by, created_at, updated_at";

export async function getKioskProducts(): Promise<KioskProduct[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("kiosk_products")
    .select(KIOSK_PRODUCT_COLUMNS)
    .order("name", { ascending: true });

  if (error) {
    console.error("getKioskProducts:", error.message);
    return [];
  }

  return (data ?? []) as KioskProduct[];
}

export async function getEventKioskSettings(
  eventId: string,
): Promise<EventKioskSettings | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("event_kiosk_settings")
    .select(EVENT_KIOSK_SETTINGS_COLUMNS)
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("getEventKioskSettings:", error.message);
    return null;
  }

  return (data as EventKioskSettings | null) ?? null;
}

export async function getEventKioskProducts(
  eventId: string,
): Promise<EventKioskProductWithCatalog[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("event_kiosk_products")
    .select(
      `${EVENT_KIOSK_PRODUCT_COLUMNS}, kiosk_products ( name, slug, category, image_url, is_active )`,
    )
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getEventKioskProducts:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const catalog = Array.isArray(row.kiosk_products)
      ? row.kiosk_products[0]
      : row.kiosk_products;

    return {
      id: row.id,
      event_id: row.event_id,
      product_id: row.product_id,
      price: row.price,
      stock_total: row.stock_total,
      stock_sold: row.stock_sold,
      is_available: row.is_available,
      sort_order: row.sort_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
      product_name: catalog?.name ?? "Producto",
      product_slug: catalog?.slug ?? "",
      product_category: catalog?.category ?? null,
      product_image_url: catalog?.image_url ?? null,
      product_is_active: catalog?.is_active ?? true,
    } satisfies EventKioskProductWithCatalog;
  });
}

export async function getEventKioskOrders(eventId: string): Promise<KioskOrder[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("kiosk_orders")
    .select(KIOSK_ORDER_COLUMNS)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getEventKioskOrders:", error.message);
    return [];
  }

  return (data ?? []) as KioskOrder[];
}

export async function getKioskProductByIdForAdmin(
  productId: string,
): Promise<KioskProduct | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("kiosk_products")
    .select(KIOSK_PRODUCT_COLUMNS)
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error("getKioskProductByIdForAdmin:", error.message);
    return null;
  }

  return (data as KioskProduct | null) ?? null;
}

export async function getEventKioskProductByIdForAdmin(
  eventKioskProductId: string,
): Promise<EventKioskProductWithCatalog | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("event_kiosk_products")
    .select(
      `${EVENT_KIOSK_PRODUCT_COLUMNS}, kiosk_products ( name, slug, category, image_url, is_active )`,
    )
    .eq("id", eventKioskProductId)
    .maybeSingle();

  if (error || !data) {
    if (error) {
      console.error("getEventKioskProductByIdForAdmin:", error.message);
    }
    return null;
  }

  const catalog = Array.isArray(data.kiosk_products)
    ? data.kiosk_products[0]
    : data.kiosk_products;

  return {
    id: data.id,
    event_id: data.event_id,
    product_id: data.product_id,
    price: data.price,
    stock_total: data.stock_total,
    stock_sold: data.stock_sold,
    is_available: data.is_available,
    sort_order: data.sort_order,
    created_at: data.created_at,
    updated_at: data.updated_at,
    product_name: catalog?.name ?? "Producto",
    product_slug: catalog?.slug ?? "",
    product_category: catalog?.category ?? null,
    product_image_url: catalog?.image_url ?? null,
    product_is_active: catalog?.is_active ?? true,
  };
}

const KIOSK_ORDER_ITEM_COLUMNS =
  "id, order_id, event_kiosk_product_id, product_name, unit_price, quantity, subtotal, created_at";

const EMPTY_PUBLIC_EVENT_KIOSK: PublicEventKioskData = {
  settings: null,
  products: [],
  presaleEnabled: false,
  hasListedProducts: false,
  hasSellableProducts: false,
};

export async function getPublicEventKiosk(
  eventId: string,
): Promise<PublicEventKioskData> {
  const supabase = await createClient();

  const { data: settings, error: settingsError } = await supabase
    .from("event_kiosk_settings")
    .select(EVENT_KIOSK_SETTINGS_COLUMNS)
    .eq("event_id", eventId)
    .maybeSingle();

  if (settingsError) {
    console.error("getPublicEventKiosk settings:", settingsError.message);
    return EMPTY_PUBLIC_EVENT_KIOSK;
  }

  if (!settings?.presale_enabled) {
    return EMPTY_PUBLIC_EVENT_KIOSK;
  }

  const { data, error } = await supabase
    .from("event_kiosk_products")
    .select(
      `${EVENT_KIOSK_PRODUCT_COLUMNS}, kiosk_products ( name, slug, description, category, image_url, is_active )`,
    )
    .eq("event_id", eventId)
    .eq("is_available", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getPublicEventKiosk products:", error.message);
    return {
      ...EMPTY_PUBLIC_EVENT_KIOSK,
      settings: settings as EventKioskSettings,
      presaleEnabled: true,
    };
  }

  const listed = (data ?? [])
    .map((row) => {
      const catalog = Array.isArray(row.kiosk_products)
        ? row.kiosk_products[0]
        : row.kiosk_products;

      if (!catalog?.is_active) {
        return null;
      }

      return {
        id: row.id,
        event_id: row.event_id,
        product_id: row.product_id,
        price: row.price,
        stock_total: row.stock_total,
        stock_sold: row.stock_sold,
        is_available: row.is_available,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        product_name: catalog.name ?? "Producto",
        product_slug: catalog.slug ?? "",
        product_category: catalog.category ?? null,
        product_image_url: catalog.image_url ?? null,
        product_is_active: catalog.is_active ?? true,
        product_description: catalog.description ?? null,
      } satisfies PublicEventKioskProduct;
    })
    .filter((product): product is PublicEventKioskProduct => product != null)
    .sort((left, right) => {
      if (left.sort_order !== right.sort_order) {
        return left.sort_order - right.sort_order;
      }

      return left.product_name.localeCompare(right.product_name, "es");
    });

  const sellable = listed.filter((product) => !isKioskProductSoldOut(product));

  return {
    settings: settings as EventKioskSettings,
    products: sellable,
    presaleEnabled: true,
    hasListedProducts: listed.length > 0,
    hasSellableProducts: sellable.length > 0,
  };
}

export async function getKioskOrderItemsByEventId(
  eventId: string,
): Promise<KioskOrderItem[]> {
  const { supabase } = await requireAdminPage();

  const { data: orders, error: ordersError } = await supabase
    .from("kiosk_orders")
    .select("id")
    .eq("event_id", eventId);

  if (ordersError || !orders?.length) {
    if (ordersError) {
      console.error("getKioskOrderItemsByEventId orders:", ordersError.message);
    }
    return [];
  }

  const orderIds = orders.map((order) => order.id);

  const { data, error } = await supabase
    .from("kiosk_order_items")
    .select(KIOSK_ORDER_ITEM_COLUMNS)
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getKioskOrderItemsByEventId:", error.message);
    return [];
  }

  return (data ?? []) as KioskOrderItem[];
}
