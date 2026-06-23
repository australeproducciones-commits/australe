import { requireAdminPage } from "@/lib/events/queries";
import { computeStockAvailable, isLowStock } from "@/lib/products/stock";
import type {
  GlobalProduct,
  ProductCategory,
  ProductDashboardStats,
  ProductListFilters,
  ProductStockMovement,
} from "@/lib/products/types";
import { throwSupabaseQueryError } from "@/lib/supabase/queryError";

const PRODUCT_COLUMNS =
  "id, name, slug, description, image_url, sku, unit, category_id, stock_on_hand, stock_reserved, low_stock_threshold, is_active, created_at, updated_at";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sku: string | null;
  unit: string;
  category_id: string | null;
  stock_on_hand: number;
  stock_reserved: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

function mapProductRow(
  row: ProductRow,
  eventsUsedCount = 0,
  categoryName: string | null = null,
): GlobalProduct {
  const stockAvailable = computeStockAvailable(
    row.stock_on_hand,
    row.stock_reserved,
  );

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image_url: row.image_url,
    sku: row.sku,
    unit: row.unit,
    category_id: row.category_id,
    category_name: categoryName,
    stock_on_hand: row.stock_on_hand,
    stock_reserved: row.stock_reserved,
    stock_available: stockAvailable,
    low_stock_threshold: row.low_stock_threshold,
    is_active: row.is_active,
    is_low_stock: isLowStock(stockAvailable, row.low_stock_threshold),
    events_used_count: eventsUsedCount,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function getEventUsageCounts(
  productIds: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (productIds.length === 0) {
    return map;
  }

  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase
    .from("event_kiosk_products")
    .select("product_id")
    .in("product_id", productIds);

  if (error) {
    throwSupabaseQueryError("getEventUsageCounts", error);
  }

  for (const row of data ?? []) {
    map.set(row.product_id, (map.get(row.product_id) ?? 0) + 1);
  }

  return map;
}

export async function getProductCategoriesForAdmin(): Promise<ProductCategory[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("kiosk_product_categories")
    .select("id, name, sort_order, is_active, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throwSupabaseQueryError("getProductCategoriesForAdmin", error);
  }

  return (data ?? []) as ProductCategory[];
}

export async function getActiveProductCategories(): Promise<ProductCategory[]> {
  const categories = await getProductCategoriesForAdmin();
  return categories.filter((category) => category.is_active);
}

export async function getProductsDashboardStats(): Promise<ProductDashboardStats> {
  const products = await getProductsForAdmin({ hideInactive: false });
  const categories = await getProductCategoriesForAdmin();

  let availableUnits = 0;
  let lowStockCount = 0;
  let activeCount = 0;
  let inactiveCount = 0;

  for (const product of products) {
    if (product.is_active) {
      activeCount += 1;
    } else {
      inactiveCount += 1;
    }
    availableUnits += product.stock_available;
    if (product.is_low_stock && product.is_active) {
      lowStockCount += 1;
    }
  }

  return {
    activeCount,
    inactiveCount,
    availableUnits,
    lowStockCount,
    categoryCount: categories.filter((c) => c.is_active).length,
  };
}

export async function getProductsForAdmin(
  filters: ProductListFilters = {},
): Promise<GlobalProduct[]> {
  const { supabase } = await requireAdminPage();

  let query = supabase
    .from("kiosk_products")
    .select(PRODUCT_COLUMNS)
    .order("name", { ascending: true });

  if (filters.hideInactive !== false) {
    query = query.eq("is_active", true);
  }

  if (filters.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01" || error.message.includes("category_id")) {
      throwSupabaseQueryError(
        "getProductsForAdmin",
        error,
        "Revisá que la migración de inventario global esté aplicada en Supabase.",
      );
    }
    throwSupabaseQueryError("getProductsForAdmin", error);
  }

  const rows = (data ?? []) as ProductRow[];
  const categories = await getProductCategoriesForAdmin();
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const usageMap = await getEventUsageCounts(rows.map((row) => row.id));

  let products = rows.map((row) =>
    mapProductRow(
      row,
      usageMap.get(row.id) ?? 0,
      row.category_id ? categoryNameById.get(row.category_id) ?? null : null,
    ),
  );

  const q = filters.q?.trim().toLowerCase();
  if (q) {
    products = products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q),
    );
  }

  const sku = filters.sku?.trim().toLowerCase();
  if (sku) {
    products = products.filter((product) =>
      (product.sku ?? "").toLowerCase().includes(sku),
    );
  }

  if (filters.lowStockOnly) {
    products = products.filter((product) => product.is_low_stock);
  }

  if (filters.usedInEventsOnly) {
    products = products.filter((product) => product.events_used_count > 0);
  }

  return products;
}

export async function getProductByIdForAdmin(
  id: string,
): Promise<GlobalProduct | null> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("kiosk_products")
    .select(PRODUCT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throwSupabaseQueryError("getProductByIdForAdmin", error);
  }

  if (!data) {
    return null;
  }

  const usageMap = await getEventUsageCounts([id]);
  const categories = await getProductCategoriesForAdmin();
  const categoryName = data.category_id
    ? categories.find((c) => c.id === data.category_id)?.name ?? null
    : null;

  return mapProductRow(
    data as ProductRow,
    usageMap.get(id) ?? 0,
    categoryName,
  );
}

export async function getProductStockMovements(
  productId: string,
  limit = 50,
): Promise<ProductStockMovement[]> {
  const { supabase } = await requireAdminPage();

  const { data, error } = await supabase
    .from("kiosk_product_stock_movements")
    .select(
      "id, product_id, event_id, order_id, order_item_id, movement_type, quantity_delta, previous_stock_on_hand, resulting_stock_on_hand, previous_stock_reserved, resulting_stock_reserved, reason, created_by, created_at",
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throwSupabaseQueryError("getProductStockMovements", error);
  }

  return (data ?? []) as ProductStockMovement[];
}

export async function canDeleteProduct(productId: string): Promise<{
  allowed: boolean;
  reason: string | null;
}> {
  const { supabase } = await requireAdminPage();

  const checks = await Promise.all([
    supabase
      .from("event_kiosk_products")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
    supabase
      .from("kiosk_order_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
    supabase
      .from("kiosk_product_stock_movements")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
  ]);

  for (const result of checks) {
    if (result.error && result.error.code !== "42P01") {
      throwSupabaseQueryError("canDeleteProduct", result.error);
    }
  }

  const eventLinks = checks[0].count ?? 0;
  const orderItems = checks[1].count ?? 0;
  const movements = checks[2].count ?? 0;

  if (eventLinks > 0 || orderItems > 0 || movements > 0) {
    return {
      allowed: false,
      reason:
        "Este producto tiene historial (eventos, órdenes o movimientos). Podés desactivarlo.",
    };
  }

  return { allowed: true, reason: null };
}
