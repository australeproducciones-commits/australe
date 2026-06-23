import type { ProductUnit } from "@/lib/products/constants";

export type ProductCategory = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type GlobalProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sku: string | null;
  unit: string;
  category_id: string | null;
  category_name: string | null;
  stock_on_hand: number;
  stock_reserved: number;
  stock_available: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  is_low_stock: boolean;
  events_used_count: number;
  created_at: string;
  updated_at: string;
};

export type ProductStockMovement = {
  id: string;
  product_id: string;
  event_id: string | null;
  order_id: string | null;
  order_item_id: string | null;
  movement_type: string;
  quantity_delta: number;
  previous_stock_on_hand: number;
  resulting_stock_on_hand: number;
  previous_stock_reserved: number | null;
  resulting_stock_reserved: number | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export type ProductDashboardStats = {
  activeCount: number;
  inactiveCount: number;
  availableUnits: number;
  lowStockCount: number;
  categoryCount: number;
};

export type ProductFormInput = {
  name: string;
  category_id: string;
  description?: string | null;
  image_url?: string | null;
  sku?: string | null;
  unit: ProductUnit | string;
  initial_stock?: number;
  low_stock_threshold?: number | null;
  is_active?: boolean;
};

export type CategoryFormInput = {
  name: string;
  sort_order?: number;
  is_active?: boolean;
};

export type StockAdjustInput = {
  movement_type: string;
  quantity: number;
  reason: string;
};

export type ProductsActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export type ProductListFilters = {
  q?: string;
  sku?: string;
  categoryId?: string | null;
  lowStockOnly?: boolean;
  usedInEventsOnly?: boolean;
  hideInactive?: boolean;
};
