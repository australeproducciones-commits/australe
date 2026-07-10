export const STORE_PRODUCT_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  INACTIVE: "inactive",
  ARCHIVED: "archived",
} as const;

export type StoreProductStatus =
  (typeof STORE_PRODUCT_STATUS)[keyof typeof STORE_PRODUCT_STATUS];

export const STORE_ORDER_STATUS = {
  PENDING: "pending",
  RESERVED: "reserved",
  PAID: "paid",
  PREPARING: "preparing",
  READY: "ready",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  REFUNDED: "refunded",
} as const;

export type StoreOrderStatus =
  (typeof STORE_ORDER_STATUS)[keyof typeof STORE_ORDER_STATUS];

export const STORE_PAYMENT_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const;

export type StorePaymentStatus =
  (typeof STORE_PAYMENT_STATUS)[keyof typeof STORE_PAYMENT_STATUS];

export type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  category: string;
  status: StoreProductStatus;
  public_price: number;
  community_price: number | null;
  cost_price: number | null;
  main_image_url: string | null;
  gallery_urls: string[];
  is_active: boolean;
  is_featured: boolean;
  community_only: boolean;
  track_stock: boolean;
  stock_total: number;
  stock_reserved: number;
  stock_sold: number;
  max_per_order: number | null;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreProductVariant = {
  id: string;
  product_id: string;
  sku: string | null;
  name: string;
  size: string | null;
  color: string | null;
  model: string | null;
  price_override: number | null;
  community_price_override: number | null;
  stock_total: number;
  stock_reserved: number;
  stock_sold: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type StoreCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventStoreSettings = {
  event_id: string;
  merchandising_enabled: boolean;
  show_badge: boolean;
  badge_text: string;
  show_products_block: boolean;
  pickup_enabled: boolean;
  pickup_instructions: string | null;
  max_featured_products: number;
  created_at: string;
  updated_at: string;
};

export type EventStoreProduct = {
  id: string;
  event_id: string;
  product_id: string;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  event_price_override: number | null;
  event_community_price_override: number | null;
  pickup_available: boolean;
  pickup_instructions: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StoreOrder = {
  id: string;
  order_number: string;
  user_id: string | null;
  event_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: StoreOrderStatus;
  payment_status: StorePaymentStatus;
  payment_provider: string | null;
  payment_reference: string | null;
  subtotal: number;
  discount_total: number;
  points_discount: number;
  total: number;
  pickup_method: string;
  pickup_event_id: string | null;
  pickup_instructions: string | null;
  pickup_code: string | null;
  reserved_until: string | null;
  paid_at: string | null;
  prepared_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  loyalty_points_awarded: number;
  created_at: string;
  updated_at: string;
};

export type StoreOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name_snapshot: string;
  variant_name_snapshot: string | null;
  sku_snapshot: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  community_price_applied: boolean;
  created_at: string;
  updated_at: string;
};

export type StoreStockMovement = {
  id: string;
  product_id: string;
  variant_id: string | null;
  order_id: string | null;
  event_id: string | null;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type PublicStoreProduct = StoreProduct & {
  variants: StoreProductVariant[];
  available_qty: number;
  display_price: number;
  display_community_price: number | null;
};

export type StoreCartItem = {
  productId: string;
  variantId: string | null;
  quantity: number;
  eventId?: string | null;
};

export type StoreDashboardStats = {
  totalSales: number;
  pendingOrders: number;
  paidOrders: number;
  readyOrders: number;
  deliveredOrders: number;
  lowStockProducts: number;
  soldOutProducts: number;
};

export type StoreActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

export type CreateStoreOrderResult = {
  success: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  total?: number;
  pickupCode?: string;
};

export type StoreProductInput = {
  name: string;
  slug?: string;
  description?: string | null;
  short_description?: string | null;
  sku?: string | null;
  category?: string;
  status?: StoreProductStatus;
  public_price: number;
  community_price?: number | null;
  main_image_url?: string | null;
  gallery_urls?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  community_only?: boolean;
  track_stock?: boolean;
  stock_total?: number;
  max_per_order?: number | null;
  available_from?: string | null;
  available_until?: string | null;
};

export type StoreVariantInput = {
  name: string;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  model?: string | null;
  price_override?: number | null;
  community_price_override?: number | null;
  stock_total?: number;
  is_active?: boolean;
  sort_order?: number;
};

export type EventStoreSettingsInput = {
  merchandising_enabled?: boolean;
  show_badge?: boolean;
  badge_text?: string;
  show_products_block?: boolean;
  pickup_enabled?: boolean;
  pickup_instructions?: string | null;
  max_featured_products?: number;
};

export type CheckoutInput = {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  pickupEventId?: string | null;
  eventId?: string | null;
  applyCommunityPrice?: boolean;
  items: StoreCartItem[];
};
