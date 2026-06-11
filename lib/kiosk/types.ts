import type { Database } from "@/lib/supabase/types";

export const KIOSK_ORDER_PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
} as const;

export type KioskOrderPaymentStatus =
  (typeof KIOSK_ORDER_PAYMENT_STATUS)[keyof typeof KIOSK_ORDER_PAYMENT_STATUS];

export const KIOSK_ORDER_PICKUP_STATUS = {
  PENDING: "pending",
  READY: "ready",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export type KioskOrderPickupStatus =
  (typeof KIOSK_ORDER_PICKUP_STATUS)[keyof typeof KIOSK_ORDER_PICKUP_STATUS];

export const KIOSK_ORDER_SOURCE = {
  ADMIN: "admin",
  PUBLIC: "public",
  MANUAL: "manual",
} as const;

export type KioskOrderSource =
  (typeof KIOSK_ORDER_SOURCE)[keyof typeof KIOSK_ORDER_SOURCE];

export type KioskProduct =
  Database["public"]["Tables"]["kiosk_products"]["Row"];

export type EventKioskSettings =
  Database["public"]["Tables"]["event_kiosk_settings"]["Row"];

export type EventKioskProduct =
  Database["public"]["Tables"]["event_kiosk_products"]["Row"];

export type KioskOrder = Database["public"]["Tables"]["kiosk_orders"]["Row"];

export type KioskOrderItem =
  Database["public"]["Tables"]["kiosk_order_items"]["Row"];

export type EventKioskProductWithCatalog = EventKioskProduct & {
  product_name: string;
  product_slug: string;
  product_category: string | null;
  product_image_url: string | null;
  product_is_active: boolean;
};

export type PublicEventKioskProduct = EventKioskProductWithCatalog & {
  product_description: string | null;
};

export type PublicEventKioskData = {
  settings: EventKioskSettings | null;
  products: PublicEventKioskProduct[];
  presaleEnabled: boolean;
  hasListedProducts: boolean;
  hasSellableProducts: boolean;
};

export type KioskOrderWithItems = KioskOrder & {
  items: KioskOrderItem[];
};

export type KioskProductInput = {
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  default_price?: number | null;
  category?: string | null;
  is_active?: boolean;
};

export type EventKioskSettingsInput = {
  presale_enabled?: boolean;
  manual_sales_enabled?: boolean;
  notes?: string | null;
};

export type EventKioskProductInput = {
  price: number;
  stock_total?: number | null;
  is_available?: boolean;
  sort_order?: number;
};

export type KioskActionResult = {
  success: boolean;
  error?: string;
  id?: string;
};

export type ManualKioskOrderLineInput = {
  eventKioskProductId: string;
  quantity: number;
};

export type ManualKioskOrderInput = {
  buyerName: string;
  buyerWhatsapp?: string | null;
  buyerDni?: string | null;
  buyerEmail?: string | null;
  ticketId?: string | null;
  paymentStatus: "pending" | "paid";
  notes?: string | null;
  items: ManualKioskOrderLineInput[];
};

export type ManualKioskOrderResult =
  | {
      ok: true;
      orderId: string;
      orderCode: string;
      totalAmount: number;
    }
  | {
      ok: false;
      message: string;
    };

export type KioskOrderManageResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type PublicKioskOrderInput = {
  buyerName: string;
  buyerWhatsapp?: string | null;
  buyerDni?: string | null;
  buyerEmail?: string | null;
  notes?: string | null;
  items: ManualKioskOrderLineInput[];
};

export type PublicKioskOrderResult =
  | {
      ok: true;
      orderId: string;
      orderCode: string;
      totalAmount: number;
    }
  | {
      ok: false;
      message: string;
    };

export type PublicKioskOrderLinkedInput = {
  ticketId?: string | null;
  buyerName: string;
  buyerWhatsapp?: string | null;
  buyerDni?: string | null;
  buyerEmail?: string | null;
  notes?: string | null;
  items: ManualKioskOrderLineInput[];
};

export type PublicKioskReservationItemInput = ManualKioskOrderLineInput & {
  productName?: string;
  unitPrice?: number;
};
