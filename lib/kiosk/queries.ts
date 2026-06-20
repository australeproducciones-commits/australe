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
  "event_id, presale_enabled, manual_sales_enabled, qr_sale_enabled, show_price_list, notes, created_at, updated_at";

const EVENT_KIOSK_PRODUCT_COLUMNS =
  "id, event_id, product_id, price, community_price, stock_total, stock_sold, is_available, is_visible, presale_enabled, qr_sale_enabled, cashier_sale_enabled, max_per_order, sort_order, created_at, updated_at";

const KIOSK_ORDER_COLUMNS =
  "id, event_id, buyer_name, buyer_whatsapp, buyer_dni, buyer_email, ticket_id, order_code, source, payment_status, pickup_status, total_amount, paid_at, delivered_at, notes, created_by, created_at, updated_at";

function mapEventKioskProductWithCatalog(
  row: Record<string, unknown>,
): EventKioskProductWithCatalog {
  const catalog = Array.isArray(row.kiosk_products)
    ? row.kiosk_products[0]
    : row.kiosk_products;

  return {
    id: row.id as string,
    event_id: row.event_id as string,
    product_id: row.product_id as string,
    price: row.price as number,
    community_price: (row.community_price as number | null) ?? null,
    stock_total: (row.stock_total as number | null) ?? null,
    stock_sold: (row.stock_sold as number) ?? 0,
    is_available: (row.is_available as boolean) ?? true,
    is_visible: (row.is_visible as boolean) ?? true,
    presale_enabled: (row.presale_enabled as boolean) ?? true,
    qr_sale_enabled: (row.qr_sale_enabled as boolean) ?? true,
    cashier_sale_enabled: (row.cashier_sale_enabled as boolean) ?? true,
    max_per_order: (row.max_per_order as number | null) ?? null,
    sort_order: (row.sort_order as number) ?? 0,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    product_name: catalog?.name ?? "Producto",
    product_slug: catalog?.slug ?? "",
    product_category: catalog?.category ?? null,
    product_image_url: catalog?.image_url ?? null,
    product_is_active: catalog?.is_active ?? true,
  };
}

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

  return (data ?? []).map((row) =>
    mapEventKioskProductWithCatalog(row as Record<string, unknown>),
  );
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

  return mapEventKioskProductWithCatalog(data as Record<string, unknown>);
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
      const mapped = mapEventKioskProductWithCatalog(
        row as Record<string, unknown>,
      );

      if (!mapped.product_is_active) {
        return null;
      }

      const catalog = Array.isArray(row.kiosk_products)
        ? row.kiosk_products[0]
        : row.kiosk_products;

      return {
        ...mapped,
        product_description: catalog?.description ?? null,
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

/** Catálogo de consumiciones para QR / lista de precios (sin filtrar agotados). */
export async function getEventKioskCatalogForQr(
  eventId: string,
): Promise<PublicEventKioskProduct[]> {
  const supabase = await createClient();

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
    console.error("getEventKioskCatalogForQr:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => {
      const mapped = mapEventKioskProductWithCatalog(
        row as Record<string, unknown>,
      );

      if (!mapped.product_is_active) {
        return null;
      }

      const catalog = Array.isArray(row.kiosk_products)
        ? row.kiosk_products[0]
        : row.kiosk_products;

      return {
        ...mapped,
        product_description: catalog?.description ?? null,
      } satisfies PublicEventKioskProduct;
    })
    .filter((product): product is PublicEventKioskProduct => product != null);
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
