/**
 * Tipos de la base de datos de Supabase.
 * Reemplazar con tipos generados por CLI cuando exista el esquema:
 * npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProfileRow = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  role: string;
  is_active: boolean;
  staff_all_events: boolean;
  created_at: string;
  updated_at: string;
};

export type EventStaffRow = {
  id: string;
  event_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  assigned_at: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  event_id: string | null;
  details: Json | null;
  created_at: string;
};

export type EventRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  main_image_url: string | null;
  thumbnail_url: string | null;
  flyer_url: string | null;
  banner_url: string | null;
  social_presale_price: number | null;
  social_regular_price: number | null;
  box_office_preview: string | null;
  content_kind: string;
  event_date: string | null;
  event_end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  location_name: string | null;
  address: string | null;
  capacity: number | null;
  status: string;
  audience: string;
  financial_management_status: string;
  financial_closed_at: string | null;
  financial_closed_by: string | null;
  ticket_sale_mode: string;
  external_ticket_url: string | null;
  sale_web_enabled: boolean;
  external_sale_enabled: boolean;
  sale_whatsapp_enabled: boolean;
  reservation_enabled: boolean;
  whatsapp_sale_number: string | null;
  whatsapp_sale_message: string | null;
  is_featured: boolean;
  featured_ticket_label: string | null;
  featured_until: string | null;
  home_order: number;
  sales_qr_enabled: boolean;
  sales_qr_code: string | null;
  sales_qr_url: string | null;
  qr_sell_tickets: boolean;
  qr_products_enabled: boolean;
  qr_show_price_list: boolean;
  qr_sell_products: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventStreamRow = {
  id: string;
  event_id: string;
  title: string | null;
  subtitle: string | null;
  is_enabled: boolean;
  status: string;
  provider: string;
  stream_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  access_type: string;
  stream_banner_url: string | null;
  stream_banner_mobile_url: string | null;
  home_featured: boolean;
  home_order: number;
  show_on_streaming_page: boolean;
  show_on_event_page: boolean;
  button_label: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketTypeRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  public_price: number;
  community_price: number;
  stock_total: number | null;
  stock_sold: number;
  max_per_order: number;
  sale_start_at: string | null;
  sale_end_at: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type CommunityMemberRow = {
  id: string;
  profile_id: string | null;
  full_name: string;
  whatsapp: string;
  dni: string;
  birth_date: string;
  status: string;
  community_code: string;
  suspended_at?: string | null;
  suspension_reason?: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunitySettingsRow = {
  id: number;
  community_enabled: boolean;
  ticket_points_enabled: boolean;
  consumption_points_enabled: boolean;
  store_points_enabled: boolean;
  amount_per_point: number;
  welcome_points: number;
  public_title: string;
  public_description: string;
  created_at: string;
  updated_at: string;
};

export type CommunityLevelRow = {
  id: string;
  name: string;
  minimum_lifetime_points: number;
  description: string | null;
  benefits: Json;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LoyaltyAccountRow = {
  user_id: string;
  points_balance: number;
  lifetime_points: number;
  current_level_id: string | null;
  updated_at: string;
};

export type LoyaltyTransactionRow = {
  id: string;
  user_id: string;
  transaction_type: string;
  points: number;
  balance_after: number;
  source_type: string;
  source_id: string | null;
  idempotency_key: string;
  description: string | null;
  metadata: Json;
  created_by: string | null;
  created_at: string;
};

export type CommunityRewardRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  stock: number | null;
  event_id: string | null;
  reward_type: string;
  reward_value: Json | null;
  starts_at: string | null;
  ends_at: string | null;
  max_per_user: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CommunityRedemptionRow = {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  redemption_code: string;
  status: string;
  redeemed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CommunityEventInvitationRow = {
  id: string;
  user_id: string;
  event_id: string;
  invitation_type: string;
  channel: string;
  status: string;
  message: string | null;
  public_token: string | null;
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
  opened_at: string | null;
  accepted_at: string | null;
  used_at: string | null;
  cancelled_at: string | null;
  expires_at: string;
  accepted_by: string | null;
  metadata: Json;
};

export type TicketRow = {
  id: string;
  event_id: string;
  ticket_type_id: string | null;
  user_id: string | null;
  community_member_id: string | null;
  buyer_name: string;
  buyer_whatsapp: string | null;
  buyer_dni: string | null;
  qr_token: string;
  qr_image_url: string | null;
  price_paid: number;
  original_price: number;
  discount_amount: number;
  payment_method: string;
  payment_status: string;
  ticket_status: string;
  sales_channel: string;
  reservation_expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  sold_by: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type KioskProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  default_price: number | null;
  category: string | null;
  category_id: string | null;
  sku: string | null;
  unit: string;
  stock_on_hand: number;
  stock_reserved: number;
  low_stock_threshold: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EventKioskSettingsRow = {
  event_id: string;
  presale_enabled: boolean;
  manual_sales_enabled: boolean;
  qr_sale_enabled: boolean;
  show_price_list: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type EventKioskProductRow = {
  id: string;
  event_id: string;
  product_id: string;
  price: number;
  community_price: number | null;
  stock_total: number | null;
  stock_sold: number;
  is_available: boolean;
  is_visible: boolean;
  presale_enabled: boolean;
  qr_sale_enabled: boolean;
  cashier_sale_enabled: boolean;
  max_per_order: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type KioskOrderRow = {
  id: string;
  event_id: string;
  buyer_name: string;
  buyer_whatsapp: string | null;
  buyer_dni: string | null;
  buyer_email: string | null;
  ticket_id: string | null;
  order_code: string;
  source: string;
  payment_status: string;
  pickup_status: string;
  total_amount: number;
  paid_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type KioskProductCategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type KioskProductStockMovementRow = {
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

export type KioskOrderItemRow = {
  id: string;
  order_id: string;
  event_kiosk_product_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  community_price_applied: number | null;
  quantity: number;
  subtotal: number;
  created_at: string;
};

export type StoreProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  sku: string | null;
  category: string;
  status: string;
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

export type StoreProductVariantRow = {
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

export type StoreCollectionRow = {
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

export type StoreCollectionProductRow = {
  id: string;
  collection_id: string;
  product_id: string;
  sort_order: number;
  created_at: string;
};

export type EventStoreSettingsRow = {
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

export type EventStoreProductRow = {
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

export type StoreOrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  event_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  payment_status: string;
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
  pickup_token_hash: string | null;
  reserved_until: string | null;
  paid_at: string | null;
  prepared_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  delivered_by: string | null;
  cancelled_at: string | null;
  loyalty_points_awarded: number;
  created_at: string;
  updated_at: string;
};

export type StoreOrderItemRow = {
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

export type StoreStockMovementRow = {
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

export type AnalyticsEventRow = {
  id: string;
  event_name: string;
  page_path: string;
  event_id: string | null;
  ticket_type_id: string | null;
  session_id: string;
  visitor_id: string;
  referrer: string | null;
  user_agent: string | null;
  metadata: Json;
  created_at: string;
};

export type EventExpenseCategoryRow = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type EventExpenseRow = {
  id: string;
  event_id: string;
  category_id: string | null;
  concept: string;
  description: string | null;
  provider: string | null;
  amount: number;
  quantity: number;
  unit_price: number | null;
  expense_date: string | null;
  due_date: string | null;
  status: string;
  payment_method: string | null;
  receipt_number: string | null;
  internal_note: string | null;
  amount_paid: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EventOtherIncomeRow = {
  id: string;
  event_id: string;
  concept: string;
  category: string | null;
  amount: number;
  income_date: string | null;
  status: string;
  note: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteSettingsRow = {
  id: number;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_location: string | null;
  instagram_url: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type PartnerRow = {
  id: string;
  name: string;
  description: string | null;
  image_url: string;
  destination_url: string | null;
  label: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
  view_count: number;
  click_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdvertisingCampaignRow = {
  id: string;
  internal_name: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  button_label: string | null;
  destination_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  frequency: string;
  open_in_new_tab: boolean;
  view_count: number;
  click_count: number;
  dismiss_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AdvertisingImpressionRow = {
  id: string;
  campaign_id: string;
  user_id: string;
  viewed_at: string;
  clicked_at: string | null;
  dismissed_at: string | null;
};

export type EventGalleryItemRow = {
  id: string;
  event_id: string;
  media_type: "image" | "youtube" | "vimeo";
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  sort_order: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      events: {
        Row: EventRow;
        Insert: Omit<EventRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventRow>;
        Relationships: [];
      };
      event_gallery_items: {
        Row: EventGalleryItemRow;
        Insert: Omit<EventGalleryItemRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventGalleryItemRow>;
        Relationships: [
          {
            foreignKeyName: "event_gallery_items_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      event_streams: {
        Row: EventStreamRow;
        Insert: Omit<EventStreamRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventStreamRow>;
        Relationships: [
          {
            foreignKeyName: "event_streams_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      ticket_types: {
        Row: TicketTypeRow;
        Insert: Omit<TicketTypeRow, "id" | "created_at" | "updated_at" | "stock_sold"> & {
          id?: string;
          stock_sold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<TicketTypeRow>;
        Relationships: [];
      };
      community_members: {
        Row: CommunityMemberRow;
        Insert: Omit<
          CommunityMemberRow,
          "id" | "created_at" | "updated_at" | "suspended_at" | "suspension_reason"
        > & {
          id?: string;
          suspended_at?: string | null;
          suspension_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CommunityMemberRow>;
        Relationships: [];
      };
      community_settings: {
        Row: CommunitySettingsRow;
        Insert: Partial<CommunitySettingsRow> & { id?: number };
        Update: Partial<CommunitySettingsRow>;
        Relationships: [];
      };
      community_levels: {
        Row: CommunityLevelRow;
        Insert: Omit<CommunityLevelRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CommunityLevelRow>;
        Relationships: [];
      };
      loyalty_accounts: {
        Row: LoyaltyAccountRow;
        Insert: Partial<LoyaltyAccountRow> & { user_id: string };
        Update: Partial<LoyaltyAccountRow>;
        Relationships: [];
      };
      loyalty_transactions: {
        Row: LoyaltyTransactionRow;
        Insert: Omit<LoyaltyTransactionRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<LoyaltyTransactionRow>;
        Relationships: [];
      };
      community_rewards: {
        Row: CommunityRewardRow;
        Insert: Omit<CommunityRewardRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CommunityRewardRow>;
        Relationships: [];
      };
      community_redemptions: {
        Row: CommunityRedemptionRow;
        Insert: Omit<CommunityRedemptionRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<CommunityRedemptionRow>;
        Relationships: [];
      };
      community_event_invitations: {
        Row: CommunityEventInvitationRow;
        Insert: Partial<
          Omit<CommunityEventInvitationRow, "id" | "created_at">
        > & {
          user_id: string;
          event_id: string;
          invitation_type: string;
          channel: string;
          status: string;
        };
        Update: Partial<CommunityEventInvitationRow>;
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: Omit<AnalyticsEventRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AnalyticsEventRow>;
        Relationships: [];
      };
      event_expense_categories: {
        Row: EventExpenseCategoryRow;
        Insert: Omit<EventExpenseCategoryRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<EventExpenseCategoryRow>;
        Relationships: [];
      };
      event_expenses: {
        Row: EventExpenseRow;
        Insert: Omit<EventExpenseRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventExpenseRow>;
        Relationships: [];
      };
      event_other_income: {
        Row: EventOtherIncomeRow;
        Insert: Omit<EventOtherIncomeRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventOtherIncomeRow>;
        Relationships: [];
      };
      tickets: {
        Row: TicketRow;
        Insert: Partial<TicketRow> & {
          event_id: string;
          buyer_name: string;
          qr_token: string;
        };
        Update: Partial<TicketRow>;
        Relationships: [];
      };
      kiosk_products: {
        Row: KioskProductRow;
        Insert: Omit<KioskProductRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<KioskProductRow>;
        Relationships: [];
      };
      kiosk_product_categories: {
        Row: KioskProductCategoryRow;
        Insert: Omit<KioskProductCategoryRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<KioskProductCategoryRow>;
        Relationships: [];
      };
      kiosk_product_stock_movements: {
        Row: KioskProductStockMovementRow;
        Insert: Omit<KioskProductStockMovementRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<KioskProductStockMovementRow>;
        Relationships: [];
      };
      event_kiosk_settings: {
        Row: EventKioskSettingsRow;
        Insert: Omit<EventKioskSettingsRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventKioskSettingsRow>;
        Relationships: [];
      };
      event_kiosk_products: {
        Row: EventKioskProductRow;
        Insert: Omit<
          EventKioskProductRow,
          "id" | "created_at" | "updated_at" | "stock_sold"
        > & {
          id?: string;
          stock_sold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventKioskProductRow>;
        Relationships: [];
      };
      kiosk_orders: {
        Row: KioskOrderRow;
        Insert: Omit<KioskOrderRow, "id" | "created_at" | "updated_at" | "total_amount"> & {
          id?: string;
          order_code?: string;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<KioskOrderRow>;
        Relationships: [];
      };
      kiosk_order_items: {
        Row: KioskOrderItemRow;
        Insert: Omit<KioskOrderItemRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<KioskOrderItemRow>;
        Relationships: [];
      };
      store_products: {
        Row: StoreProductRow;
        Insert: Omit<StoreProductRow, "id" | "created_at" | "updated_at" | "stock_reserved" | "stock_sold" | "gallery_urls"> & {
          id?: string;
          stock_reserved?: number;
          stock_sold?: number;
          gallery_urls?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<StoreProductRow>;
        Relationships: [];
      };
      store_product_variants: {
        Row: StoreProductVariantRow;
        Insert: Omit<StoreProductVariantRow, "id" | "created_at" | "updated_at" | "stock_reserved" | "stock_sold"> & {
          id?: string;
          stock_reserved?: number;
          stock_sold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<StoreProductVariantRow>;
        Relationships: [];
      };
      store_collections: {
        Row: StoreCollectionRow;
        Insert: Omit<StoreCollectionRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<StoreCollectionRow>;
        Relationships: [];
      };
      store_collection_products: {
        Row: StoreCollectionProductRow;
        Insert: Omit<StoreCollectionProductRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<StoreCollectionProductRow>;
        Relationships: [];
      };
      event_store_settings: {
        Row: EventStoreSettingsRow;
        Insert: Omit<EventStoreSettingsRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventStoreSettingsRow>;
        Relationships: [];
      };
      event_store_products: {
        Row: EventStoreProductRow;
        Insert: Omit<EventStoreProductRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventStoreProductRow>;
        Relationships: [];
      };
      store_orders: {
        Row: StoreOrderRow;
        Insert: Omit<StoreOrderRow, "id" | "created_at" | "updated_at" | "loyalty_points_awarded"> & {
          id?: string;
          loyalty_points_awarded?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<StoreOrderRow>;
        Relationships: [];
      };
      store_order_items: {
        Row: StoreOrderItemRow;
        Insert: Omit<StoreOrderItemRow, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<StoreOrderItemRow>;
        Relationships: [];
      };
      store_stock_movements: {
        Row: StoreStockMovementRow;
        Insert: Omit<StoreStockMovementRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<StoreStockMovementRow>;
        Relationships: [];
      };
      event_staff: {
        Row: EventStaffRow;
        Insert: Omit<EventStaffRow, "id" | "created_at" | "updated_at" | "assigned_at"> & {
          id?: string;
          assigned_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<EventStaffRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      site_settings: {
        Row: SiteSettingsRow;
        Insert: Omit<SiteSettingsRow, "updated_at"> & {
          updated_at?: string;
        };
        Update: Partial<SiteSettingsRow>;
        Relationships: [];
      };
      partners: {
        Row: PartnerRow;
        Insert: Omit<PartnerRow, "id" | "created_at" | "updated_at" | "view_count" | "click_count"> & {
          id?: string;
          view_count?: number;
          click_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<PartnerRow>;
        Relationships: [];
      };
      advertising_campaigns: {
        Row: AdvertisingCampaignRow;
        Insert: Omit<
          AdvertisingCampaignRow,
          "id" | "created_at" | "updated_at" | "view_count" | "click_count" | "dismiss_count"
        > & {
          id?: string;
          view_count?: number;
          click_count?: number;
          dismiss_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<AdvertisingCampaignRow>;
        Relationships: [];
      };
      advertising_impressions: {
        Row: AdvertisingImpressionRow;
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          viewed_at?: string;
          clicked_at?: string | null;
          dismissed_at?: string | null;
        };
        Update: Partial<AdvertisingImpressionRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ensure_profile: {
        Args: {
          p_full_name: string | null;
          p_whatsapp: string | null;
        };
        Returns: ProfileRow;
      };
      reserve_tickets: {
        Args: {
          p_event_id: string;
          p_ticket_type_id: string;
          p_quantity: number;
          p_buyer_name: string;
          p_buyer_whatsapp: string | null;
          p_buyer_dni: string | null;
        };
        Returns: TicketRow[];
      };
      cancel_ticket: {
        Args: {
          p_ticket_id: string;
          p_cancel_reason: string | null;
          p_mark_as_expired: boolean;
        };
        Returns: TicketRow;
      };
      mark_ticket_used: {
        Args: {
          p_ticket_id: string;
        };
        Returns: {
          ticket_id: string;
          event_id: string;
          ticket_status: string;
          used_at: string;
        }[];
      };
      recalculate_kiosk_order_total: {
        Args: {
          p_order_id: string;
        };
        Returns: void;
      };
      reserve_event_kiosk_stock: {
        Args: {
          p_event_kiosk_product_id: string;
          p_quantity: number;
        };
        Returns: EventKioskProductRow;
      };
      release_event_kiosk_stock: {
        Args: {
          p_event_kiosk_product_id: string;
          p_quantity: number;
        };
        Returns: EventKioskProductRow;
      };
      create_manual_kiosk_order: {
        Args: {
          p_event_id: string;
          p_buyer_name: string;
          p_buyer_whatsapp: string | null;
          p_buyer_dni: string | null;
          p_buyer_email: string | null;
          p_ticket_id: string | null;
          p_payment_status: string;
          p_notes: string | null;
          p_items: Json;
        };
        Returns: {
          order_id: string;
          order_code: string;
          total_amount: number;
        }[];
      };
      create_public_kiosk_order: {
        Args: {
          p_event_id: string;
          p_buyer_name: string;
          p_buyer_whatsapp: string | null;
          p_buyer_dni: string | null;
          p_buyer_email: string | null;
          p_notes: string | null;
          p_items: Json;
        };
        Returns: {
          order_id: string;
          order_code: string;
          total_amount: number;
        }[];
      };
      create_public_kiosk_order_linked: {
        Args: {
          p_event_id: string;
          p_ticket_id: string | null;
          p_buyer_name: string;
          p_buyer_whatsapp: string | null;
          p_buyer_dni: string | null;
          p_buyer_email: string | null;
          p_notes: string | null;
          p_items: Json;
        };
        Returns: {
          order_id: string;
          order_code: string;
          total_amount: number;
        }[];
      };
      mark_kiosk_order_paid: {
        Args: { p_order_id: string };
        Returns: {
          order_id: string;
          order_code: string;
          payment_status: string;
          paid_at: string | null;
        }[];
      };
      mark_kiosk_order_ready: {
        Args: { p_order_id: string };
        Returns: {
          order_id: string;
          order_code: string;
          pickup_status: string;
        }[];
      };
      mark_kiosk_order_delivered: {
        Args: { p_order_id: string };
        Returns: {
          order_id: string;
          order_code: string;
          pickup_status: string;
          delivered_at: string | null;
        }[];
      };
      cancel_kiosk_order: {
        Args: {
          p_order_id: string;
          p_reason: string | null;
        };
        Returns: {
          order_id: string;
          order_code: string;
          payment_status: string;
          pickup_status: string;
        }[];
      };
      record_kiosk_stock_movement: {
        Args: {
          p_product_id: string;
          p_movement_type: string;
          p_quantity_delta: number;
          p_previous_on_hand: number;
          p_resulting_on_hand: number;
          p_previous_reserved?: number | null;
          p_resulting_reserved?: number | null;
          p_event_id?: string | null;
          p_order_id?: string | null;
          p_order_item_id?: string | null;
          p_reason?: string | null;
        };
        Returns: string;
      };
      adjust_kiosk_product_stock: {
        Args: {
          p_product_id: string;
          p_movement_type: string;
          p_quantity: number;
          p_reason: string;
        };
        Returns: {
          product_id: string;
          stock_on_hand: number;
          stock_reserved: number;
          stock_available: number;
        }[];
      };
      increment_partner_view_count: {
        Args: { p_partner_id: string };
        Returns: void;
      };
      increment_partner_click_count: {
        Args: { p_partner_id: string };
        Returns: void;
      };
      increment_advertising_view_count: {
        Args: { p_campaign_id: string };
        Returns: void;
      };
      increment_advertising_click_count: {
        Args: { p_campaign_id: string };
        Returns: void;
      };
      increment_advertising_dismiss_count: {
        Args: { p_campaign_id: string };
        Returns: void;
      };
      ensure_loyalty_account: {
        Args: { p_user_id: string };
        Returns: undefined;
      };
      recalculate_loyalty_level: {
        Args: { p_user_id: string };
        Returns: string | null;
      };
      award_loyalty_points: {
        Args: {
          p_user_id: string;
          p_points: number;
          p_source_type: string;
          p_source_id: string;
          p_idempotency_key: string;
          p_description?: string | null;
          p_metadata?: Json;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      reverse_loyalty_points: {
        Args: {
          p_user_id: string;
          p_points: number;
          p_source_type: string;
          p_source_id: string;
          p_idempotency_key: string;
          p_description?: string | null;
          p_metadata?: Json;
          p_created_by?: string | null;
        };
        Returns: string;
      };
      adjust_loyalty_points: {
        Args: {
          p_user_id: string;
          p_points: number;
          p_reason: string;
          p_admin_id: string;
        };
        Returns: string;
      };
      redeem_community_reward: {
        Args: { p_user_id: string; p_reward_id: string };
        Returns: {
          redemption_id: string;
          redemption_code: string;
          points_spent: number;
        }[];
      };
      award_loyalty_points_for_ticket: {
        Args: { p_ticket_id: string };
        Returns: string | null;
      };
      reverse_loyalty_points_for_ticket: {
        Args: { p_ticket_id: string };
        Returns: string | null;
      };
      record_community_invitation_open: {
        Args: { p_token: string };
        Returns: CommunityEventInvitationRow;
      };
      accept_community_event_invitation: {
        Args: { p_token: string };
        Returns: Json;
      };
      preview_community_event_invitation: {
        Args: { p_token: string };
        Returns: Json;
      };
      record_community_invitation_open_authenticated: {
        Args: { p_token: string };
        Returns: undefined;
      };
      event_has_available_store_merch: {
        Args: { p_event_id: string };
        Returns: boolean;
      };
      store_adjust_stock: {
        Args: {
          p_product_id: string;
          p_variant_id: string | null;
          p_quantity_delta: number;
          p_reason: string;
        };
        Returns: void;
      };
      create_store_order: {
        Args: {
          p_customer_name: string;
          p_customer_email: string | null;
          p_customer_phone: string | null;
          p_pickup_event_id: string | null;
          p_event_id: string | null;
          p_items: Json;
          p_apply_community_price: boolean;
        };
        Returns: {
          order_id: string;
          order_number: string;
          total_amount: number;
          pickup_code: string;
        }[];
      };
      mark_store_order_paid: {
        Args: {
          p_order_id: string;
          p_payment_provider?: string | null;
          p_payment_reference?: string | null;
        };
        Returns: void;
      };
      mark_store_order_ready: {
        Args: { p_order_id: string };
        Returns: void;
      };
      mark_store_order_preparing: {
        Args: { p_order_id: string };
        Returns: void;
      };
      mark_store_order_delivered: {
        Args: {
          p_order_id: string;
          p_pickup_token?: string | null;
        };
        Returns: void;
      };
      lookup_store_order_for_pickup: {
        Args: {
          p_code?: string | null;
          p_order_number?: string | null;
        };
        Returns: StoreOrderRow[];
      };
      cancel_store_order: {
        Args: {
          p_order_id: string;
          p_reason?: string | null;
        };
        Returns: void;
      };
      award_loyalty_points_for_store_order: {
        Args: { p_order_id: string };
        Returns: string | null;
      };
      reverse_loyalty_points_for_store_order: {
        Args: { p_order_id: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
