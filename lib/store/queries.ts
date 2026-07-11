import { getProfile } from "@/lib/auth/getProfile";
import { isActiveCommunityMember } from "@/lib/community/membership";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllEventsForAdmin } from "@/lib/events/queries";
import {
  isEventCommerceEligible,
  isEventStoreAssociationActive,
  isStoreProductVisibleInGeneralCatalog,
} from "@/lib/store/channels";
import { computeStoreProductChannelState } from "@/lib/store/adminHub";
import type {
  AdminStoreProductsPageData,
  AdminStoreProductListItem,
  EventStoreProduct,
  EventStoreSettings,
  PublicStoreProduct,
  StoreCollection,
  StoreDashboardStats,
  StoreOrder,
  StoreOrderItem,
  StoreOrderWithPayments,
  StoreProduct,
  StoreProductVariant,
  StoreStockMovement,
} from "@/lib/store/types";
import {
  getStoreStockAvailable,
  isStoreProductPubliclyAvailable,
  resolveStoreUnitPrice,
  STORE_LOW_STOCK_THRESHOLD,
} from "@/lib/store/utils";

function mapProductRow(row: StoreProduct, variants: StoreProductVariant[] = []): PublicStoreProduct {
  const activeVariants = variants.filter((v) => v.is_active);
  let availableQty = getStoreStockAvailable(row);

  if (row.track_stock && activeVariants.length > 0) {
    availableQty = activeVariants.reduce((sum, v) => {
      return sum + (getStoreStockAvailable(row, v) ?? 0);
    }, 0);
  }

  return {
    ...row,
    gallery_urls: row.gallery_urls ?? [],
    variants: activeVariants,
    available_qty: availableQty ?? 999999,
    display_price: row.public_price,
    display_community_price: row.community_price,
  };
}

export async function getPublicStoreProducts(options?: {
  category?: string | null;
  featured?: boolean;
  eventId?: string | null;
  q?: string | null;
}): Promise<PublicStoreProduct[]> {
  const supabase = await createClient();

  if (options?.eventId) {
    const eventId = options.eventId;

    const profile = await getProfile(supabase);
    const isCommunityMember = await isActiveCommunityMember(profile?.id);

    const [eventResult, settingsResult, eventProductsResult] = await Promise.all([
      supabase
        .from("events")
        .select("id, status, event_date, event_end_date, start_time, end_time")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("event_store_settings")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle(),
      supabase
        .from("event_store_products")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const event = eventResult.data;
    const settings = settingsResult.data as EventStoreSettings | null;

    if (
      eventResult.error ||
      eventProductsResult.error ||
      !event ||
      !isEventCommerceEligible(event) ||
      !settings?.merchandising_enabled
    ) {
      if (eventProductsResult.error) {
        throw eventProductsResult.error;
      }
      return [];
    }

    const products: PublicStoreProduct[] = [];

    for (const row of eventProductsResult.data ?? []) {
      const eventProduct = row as EventStoreProduct;

      if (!isEventStoreAssociationActive(eventProduct)) {
        continue;
      }

      const { data: productData } = await supabase
        .from("store_products")
        .select("*")
        .eq("id", eventProduct.product_id)
        .maybeSingle();

      const product = productData as StoreProduct | null;
      if (!product || !isStoreProductPubliclyAvailable(product)) {
        continue;
      }

      if (product.community_only && !isCommunityMember) {
        continue;
      }

      const { data: variants } = await supabase
        .from("store_product_variants")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("sort_order");

      const mapped = mapProductRow(product, (variants ?? []) as StoreProductVariant[]);
      mapped.display_price = resolveStoreUnitPrice(product, null, eventProduct);
      mapped.display_community_price =
        eventProduct.event_community_price_override ??
        product.community_price;

      if (options.category && mapped.category !== options.category) {
        continue;
      }

      if (options.featured && !eventProduct.is_featured && !mapped.is_featured) {
        continue;
      }

      if (options.q) {
        const q = options.q.toLowerCase();
        if (
          !mapped.name.toLowerCase().includes(q) &&
          !mapped.short_description?.toLowerCase().includes(q)
        ) {
          continue;
        }
      }

      if (mapped.track_stock && mapped.available_qty <= 0) {
        continue;
      }

      products.push(mapped);
    }

    return products;
  }

  const profile = await getProfile(supabase);
  const isCommunityMember = await isActiveCommunityMember(profile?.id);

  let query = supabase
    .from("store_products")
    .select("*")
    .eq("is_active", true)
    .eq("status", "active")
    .eq("show_in_store", true)
    .order("is_featured", { ascending: false })
    .order("name");

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.featured) {
    query = query.eq("is_featured", true);
  }

  if (options?.q) {
    query = query.or(
      `name.ilike.%${options.q}%,short_description.ilike.%${options.q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const result: PublicStoreProduct[] = [];

  for (const product of (data ?? []) as StoreProduct[]) {
    if (
      !isStoreProductVisibleInGeneralCatalog(product, isCommunityMember)
    ) {
      continue;
    }

    const { data: variants } = await supabase
      .from("store_product_variants")
      .select("*")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("sort_order");

    const mapped = mapProductRow(product, (variants ?? []) as StoreProductVariant[]);

    if (mapped.track_stock && mapped.available_qty <= 0) {
      continue;
    }

    result.push(mapped);
  }

  return result;
}

export async function getPublicStoreProductBySlug(
  slug: string,
  eventId?: string | null,
): Promise<PublicStoreProduct | null> {
  const supabase = await createClient();
  const profile = await getProfile(supabase);
  const isCommunityMember = await isActiveCommunityMember(profile?.id);

  const { data: product, error } = await supabase
    .from("store_products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .eq("status", "active")
    .maybeSingle();

  if (error || !product) {
    return null;
  }

  if (!isStoreProductPubliclyAvailable(product as StoreProduct)) {
    return null;
  }

  let eventOverrides: EventStoreProduct | null = null;

  if (eventId) {
    const [eventResult, settingsResult, associationResult] = await Promise.all([
      supabase
        .from("events")
        .select("id, status, event_date, event_end_date, start_time, end_time")
        .eq("id", eventId)
        .maybeSingle(),
      supabase
        .from("event_store_settings")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle(),
      supabase
        .from("event_store_products")
        .select("*")
        .eq("event_id", eventId)
        .eq("product_id", product.id)
        .maybeSingle(),
    ]);

    const event = eventResult.data;
    const settings = settingsResult.data as EventStoreSettings | null;
    const association = associationResult.data as EventStoreProduct | null;

    if (
      !event ||
      !settings?.merchandising_enabled ||
      !isEventCommerceEligible(event) ||
      !association ||
      !isEventStoreAssociationActive(association)
    ) {
      return null;
    }

    eventOverrides = association;

    if ((product as StoreProduct).community_only && !isCommunityMember) {
      return null;
    }
  } else if (
    !isStoreProductVisibleInGeneralCatalog(
      product as StoreProduct,
      isCommunityMember,
    )
  ) {
    return null;
  }

  const { data: variants } = await supabase
    .from("store_product_variants")
    .select("*")
    .eq("product_id", product.id)
    .eq("is_active", true)
    .order("sort_order");

  const mapped = mapProductRow(
    product as StoreProduct,
    (variants ?? []) as StoreProductVariant[],
  );

  mapped.display_price = resolveStoreUnitPrice(
    product as StoreProduct,
    null,
    eventOverrides,
    false,
  );
  mapped.display_community_price =
    eventOverrides?.event_community_price_override ??
    (product as StoreProduct).community_price;

  return mapped;
}

export async function getPublicStoreCollections(): Promise<StoreCollection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_collections")
    .select("*")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []) as StoreCollection[];
}

export async function eventHasStoreMerch(eventId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("event_has_available_store_merch", {
    p_event_id: eventId,
  });

  if (error) {
    console.error("eventHasStoreMerch:", error.message);
    return false;
  }

  return Boolean(data);
}

export async function getEventStoreMerchSummary(eventId: string): Promise<{
  hasMerch: boolean;
  badgeText: string;
  showBlock: boolean;
  featuredProducts: PublicStoreProduct[];
}> {
  const supabase = await createClient();

  const [hasMerch, settingsResult, products] = await Promise.all([
    eventHasStoreMerch(eventId),
    supabase
      .from("event_store_settings")
      .select("*")
      .eq("event_id", eventId)
      .maybeSingle(),
    getPublicStoreProducts({ eventId }),
  ]);

  const settings = settingsResult.data as EventStoreSettings | null;
  const maxFeatured = settings?.max_featured_products ?? 3;

  const featuredProducts = products
    .filter((p) => p.is_featured)
    .slice(0, maxFeatured);

  const fallbackFeatured =
    featuredProducts.length > 0
      ? featuredProducts
      : products.slice(0, maxFeatured);

  return {
    hasMerch: hasMerch && (settings?.show_badge ?? true),
    badgeText: settings?.badge_text ?? "MERCH DISPONIBLE",
    showBlock: settings?.show_products_block ?? true,
    featuredProducts: fallbackFeatured,
  };
}

export async function getStoreProductsForAdmin(filters?: {
  q?: string;
  category?: string;
  status?: string;
  hideInactive?: boolean;
}): Promise<StoreProduct[]> {
  const supabase = await createClient();
  let query = supabase.from("store_products").select("*").order("name");

  if (filters?.hideInactive !== false) {
    query = query.neq("status", "archived");
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.q) {
    query = query.or(
      `name.ilike.%${filters.q}%,sku.ilike.%${filters.q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as StoreProduct[];
}

export async function getStoreVariantsForProduct(
  productId: string,
): Promise<StoreProductVariant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_product_variants")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order");

  if (error) {
    throw error;
  }

  return (data ?? []) as StoreProductVariant[];
}

export async function getStoreDashboardStats(): Promise<StoreDashboardStats> {
  const supabase = await createClient();

  const [ordersResult, productsResult] = await Promise.all([
    supabase.from("store_orders").select("status, payment_status, total"),
    supabase
      .from("store_products")
      .select("track_stock, stock_total, stock_reserved, status")
      .neq("status", "archived"),
  ]);

  const orders = (ordersResult.data ?? []) as Pick<
    StoreOrder,
    "status" | "payment_status" | "total"
  >[];
  const products = (productsResult.data ?? []) as Pick<
    StoreProduct,
    "track_stock" | "stock_total" | "stock_reserved" | "status"
  >[];

  const paidOrders = orders.filter((o) => o.payment_status === "confirmed");

  return {
    totalSales: paidOrders.reduce((sum, o) => sum + Number(o.total), 0),
    pendingOrders: orders.filter((o) =>
      ["pending", "reserved"].includes(o.status),
    ).length,
    paidOrders: paidOrders.filter((o) => o.status === "paid").length,
    readyOrders: orders.filter((o) => o.status === "ready").length,
    deliveredOrders: orders.filter((o) => o.status === "delivered").length,
    lowStockProducts: products.filter((p) => {
      if (!p.track_stock) {
        return false;
      }
      const avail = p.stock_total - p.stock_reserved;
      return avail > 0 && avail <= STORE_LOW_STOCK_THRESHOLD;
    }).length,
    soldOutProducts: products.filter((p) => {
      if (!p.track_stock) {
        return false;
      }
      return p.stock_total - p.stock_reserved <= 0;
    }).length,
  };
}

export async function getStoreOrdersForAdmin(filters?: {
  status?: string;
  paymentStatus?: string;
  eventId?: string;
  q?: string;
}): Promise<StoreOrder[]> {
  const supabase = await createClient();
  let query = supabase
    .from("store_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.paymentStatus) {
    query = query.eq("payment_status", filters.paymentStatus);
  }

  if (filters?.eventId) {
    query = query.eq("pickup_event_id", filters.eventId);
  }

  if (filters?.q) {
    query = query.or(
      `order_number.ilike.%${filters.q}%,customer_name.ilike.%${filters.q}%,customer_email.ilike.%${filters.q}%,pickup_code.ilike.%${filters.q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as StoreOrder[];
}

export async function getStoreOrdersWithPaymentsForAdmin(filters?: {
  status?: string;
  paymentStatus?: string;
  eventId?: string;
  q?: string;
}): Promise<StoreOrderWithPayments[]> {
  const orders = await getStoreOrdersForAdmin(filters);
  if (orders.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const orderIds = orders.map((o) => o.id);

  const [txResult, webhookResult] = await Promise.all([
    admin
      .from("payment_transactions")
      .select(
        "id, order_id, provider, status, status_detail, amount, currency, provider_preference_id, provider_payment_id, approved_at, updated_at",
      )
      .in("order_id", orderIds)
      .order("updated_at", { ascending: false }),
    admin
      .from("payment_webhook_events")
      .select("resource_id, attempts")
      .eq("provider", "mercadopago"),
  ]);

  const txByOrder = new Map<string, StoreOrderWithPayments["payment_transactions"]>();
  for (const tx of txResult.data ?? []) {
    const orderId = tx.order_id as string;
    const list = txByOrder.get(orderId) ?? [];
    list.push({
      id: tx.id as string,
      provider: tx.provider as string,
      status: tx.status as string,
      status_detail: (tx.status_detail as string | null) ?? null,
      amount: Number(tx.amount),
      currency: tx.currency as string,
      provider_preference_id: (tx.provider_preference_id as string | null) ?? null,
      provider_payment_id: (tx.provider_payment_id as string | null) ?? null,
      approved_at: (tx.approved_at as string | null) ?? null,
      updated_at: tx.updated_at as string,
    });
    txByOrder.set(orderId, list);
  }

  const webhookCounts = new Map<string, number>();
  for (const event of webhookResult.data ?? []) {
    const resourceId = event.resource_id as string | null;
    if (!resourceId) continue;
    webhookCounts.set(resourceId, (webhookCounts.get(resourceId) ?? 0) + (event.attempts as number));
  }

  return orders.map((order) => ({
    ...order,
    payment_transactions: txByOrder.get(order.id) ?? [],
    webhook_attempts: webhookCounts.get(order.payment_reference ?? "") ?? 0,
  }));
}

export async function getStoreOrderWithItems(
  orderId: string,
): Promise<{ order: StoreOrder; items: StoreOrderItem[] } | null> {
  const supabase = await createClient();

  const [orderResult, itemsResult] = await Promise.all([
    supabase.from("store_orders").select("*").eq("id", orderId).maybeSingle(),
    supabase
      .from("store_order_items")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at"),
  ]);

  if (orderResult.error || !orderResult.data) {
    return null;
  }

  return {
    order: orderResult.data as StoreOrder,
    items: (itemsResult.data ?? []) as StoreOrderItem[],
  };
}

export async function getUserStoreOrders(userId: string): Promise<StoreOrder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as StoreOrder[];
}

export async function getStoreStockMovements(
  productId?: string,
): Promise<StoreStockMovement[]> {
  const supabase = await createClient();
  let query = supabase
    .from("store_stock_movements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (productId) {
    query = query.eq("product_id", productId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as StoreStockMovement[];
}

export async function getEventStoreSettings(
  eventId: string,
): Promise<EventStoreSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_store_settings")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as EventStoreSettings | null) ?? null;
}

export async function getEventStoreProductsForAdmin(
  eventId: string,
): Promise<(EventStoreProduct & { product: StoreProduct })[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_store_products")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) {
    throw error;
  }

  const result: (EventStoreProduct & { product: StoreProduct })[] = [];

  for (const row of data ?? []) {
    const eventProduct = row as EventStoreProduct;
    const { data: productData } = await supabase
      .from("store_products")
      .select("*")
      .eq("id", eventProduct.product_id)
      .maybeSingle();

    if (!productData) {
      continue;
    }

    result.push({
      ...eventProduct,
      product: productData as StoreProduct,
    });
  }

  return result;
}

export async function getStoreMerchFlagsForEvents(
  eventIds: string[],
): Promise<Map<string, { hasMerch: boolean; badgeText: string }>> {
  const result = new Map<string, { hasMerch: boolean; badgeText: string }>();

  if (eventIds.length === 0) {
    return result;
  }

  const admin = createAdminClient();

  const [settingsResult, merchResults] = await Promise.all([
    admin.from("event_store_settings").select("event_id, show_badge, badge_text").in("event_id", eventIds),
    Promise.all(
      eventIds.map(async (eventId) => {
        const { data } = await admin.rpc("event_has_available_store_merch", {
          p_event_id: eventId,
        });
        return { eventId, hasMerch: Boolean(data) };
      }),
    ),
  ]);

  const settingsByEvent = new Map(
    (settingsResult.data ?? []).map((s) => [s.event_id as string, s]),
  );

  for (const { eventId, hasMerch } of merchResults) {
    const settings = settingsByEvent.get(eventId);
    result.set(eventId, {
      hasMerch: hasMerch && (settings?.show_badge ?? true),
      badgeText: (settings?.badge_text as string) ?? "MERCH DISPONIBLE",
    });
  }

  return result;
}

export async function getStoreCollectionsForAdmin(): Promise<StoreCollection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("store_collections")
    .select("*")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? []) as StoreCollection[];
}

export async function getStoreAdminProductsPageData(): Promise<AdminStoreProductsPageData> {
  const supabase = await createClient();

  const [products, events, variantsResult, associationsResult, settingsResult] =
    await Promise.all([
      getStoreProductsForAdmin({ hideInactive: false }),
      getAllEventsForAdmin(),
      supabase
        .from("store_product_variants")
        .select("*")
        .order("sort_order"),
      supabase.from("event_store_products").select("*").order("sort_order"),
      supabase.from("event_store_settings").select("*"),
    ]);

  if (variantsResult.error) {
    throw variantsResult.error;
  }
  if (associationsResult.error) {
    throw associationsResult.error;
  }
  if (settingsResult.error) {
    throw settingsResult.error;
  }

  const eventsById = new Map(events.map((event) => [event.id, event]));
  const variantsByProduct = new Map<string, StoreProductVariant[]>();
  for (const variant of (variantsResult.data ?? []) as StoreProductVariant[]) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }

  const associationsByProduct = new Map<
    string,
    AdminStoreProductListItem["associations"]
  >();
  for (const row of associationsResult.data ?? []) {
    const association = row as EventStoreProduct;
    const event = eventsById.get(association.event_id);
    if (!event) {
      continue;
    }
    const list = associationsByProduct.get(association.product_id) ?? [];
    list.push({
      ...association,
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        status: event.status,
        event_date: event.event_date,
        event_end_date: event.event_end_date,
        start_time: event.start_time,
        end_time: event.end_time,
      },
    });
    associationsByProduct.set(association.product_id, list);
  }

  const settingsByEventId: Record<string, EventStoreSettings> = {};
  for (const row of settingsResult.data ?? []) {
    settingsByEventId[(row as EventStoreSettings).event_id] =
      row as EventStoreSettings;
  }

  const list: AdminStoreProductListItem[] = products.map((product) => {
    const variants = variantsByProduct.get(product.id) ?? [];
    const associations = associationsByProduct.get(product.id) ?? [];
    return {
      ...product,
      variants,
      associations,
      channel: computeStoreProductChannelState({
        product,
        variants,
        associations,
        settingsByEventId: new Map(Object.entries(settingsByEventId)),
      }),
    };
  });

  return { products: list, events, settingsByEventId };
}

export async function getEventStoreMerchAdminData(eventId: string): Promise<{
  settings: EventStoreSettings | null;
  items: (EventStoreProduct & {
    product: AdminStoreProductListItem;
    variants: StoreProductVariant[];
    channel: ReturnType<typeof computeStoreProductChannelState>;
  })[];
  allProducts: AdminStoreProductListItem[];
}> {
  const pageData = await getStoreAdminProductsPageData();
  const settings = pageData.settingsByEventId[eventId] ?? null;

  const items = pageData.products
    .map((row) => {
      const association = row.associations.find((a) => a.event_id === eventId);
      if (!association) {
        return null;
      }
      return {
        ...association,
        product: row,
        variants: row.variants,
        channel: row.channel,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null)
    .sort((a, b) => a.sort_order - b.sort_order);

  return {
    settings,
    items,
    allProducts: pageData.products,
  };
}

export type StoreCartLineDetail = {
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  imageUrl: string | null;
  unitPrice: number;
  slug: string;
  available: boolean;
};

export async function getPublicStoreCartLineDetails(
  items: { productId: string; variantId: string | null }[],
): Promise<StoreCartLineDetail[]> {
  if (items.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const productIds = [...new Set(items.map((item) => item.productId))];

  const [{ data: products }, { data: variants }] = await Promise.all([
    supabase
      .from("store_products")
      .select(
        "id, name, slug, main_image_url, public_price, is_active, status, show_in_store, available_from, available_until, track_stock, stock_total, stock_reserved",
      )
      .in("id", productIds)
      .eq("is_active", true)
      .eq("status", "active")
      .eq("show_in_store", true),
    supabase
      .from("store_product_variants")
      .select(
        "id, product_id, name, price_override, is_active, stock_total, stock_reserved",
      )
      .in("product_id", productIds)
      .eq("is_active", true),
  ]);

  const productMap = new Map(
    (products ?? []).map((row) => [row.id as string, row]),
  );
  const variantMap = new Map(
    (variants ?? []).map((row) => [row.id as string, row]),
  );

  const lines: StoreCartLineDetail[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    const variant = item.variantId ? variantMap.get(item.variantId) : null;

    if (!product) {
      lines.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: "Producto no disponible",
        variantName: null,
        imageUrl: null,
        unitPrice: 0,
        slug: "",
        available: false,
      });
      continue;
    }

    if (
      item.variantId &&
      (!variant || (variant.product_id as string) !== item.productId)
    ) {
      lines.push({
        productId: item.productId,
        variantId: item.variantId,
        productName: (product.name as string) ?? "Producto",
        variantName: null,
        imageUrl: (product.main_image_url as string | null) ?? null,
        unitPrice: 0,
        slug: (product.slug as string) ?? "",
        available: false,
      });
      continue;
    }

    const publiclyAvailable = isStoreProductPubliclyAvailable(
      product as StoreProduct,
    );
    const stockAvailable = getStoreStockAvailable(
      product as StoreProduct,
      variant as StoreProductVariant | null,
    );
    const inStock =
      stockAvailable === null || stockAvailable > 0;

    lines.push({
      productId: item.productId,
      variantId: item.variantId,
      productName: (product.name as string) ?? "Producto",
      variantName: (variant?.name as string | undefined) ?? null,
      imageUrl: (product.main_image_url as string | null) ?? null,
      unitPrice: Number(variant?.price_override ?? product.public_price ?? 0),
      slug: (product.slug as string) ?? "",
      available: publiclyAvailable && inStock,
    });
  }

  return lines;
}

export async function getRelatedPublicStoreProducts(
  productId: string,
  category: string,
  limit = 4,
): Promise<PublicStoreProduct[]> {
  const products = await getPublicStoreProducts({ category });
  return products.filter((product) => product.id !== productId).slice(0, limit);
}
