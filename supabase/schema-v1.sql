-- =============================================================================
-- Australe Producciones · Esquema de base de datos V1
-- Ejecutar manualmente en Supabase → SQL Editor (proyecto vacío o nuevo).
-- No incluye policies RLS ni datos de prueba.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Extensiones
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- B) Función para actualizar updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- C) Tablas
-- -----------------------------------------------------------------------------

-- 1. profiles
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name text,
  whatsapp text,
  role text NOT NULL DEFAULT 'customer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_role_check CHECK (
    role IN ('admin', 'cashier', 'door', 'customer')
  )
);

COMMENT ON TABLE profiles IS 'Perfiles de usuario vinculados a auth.users';

-- 2. community_members
CREATE TABLE community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  full_name text NOT NULL,
  whatsapp text NOT NULL,
  dni text NOT NULL,
  birth_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  community_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_members_status_check CHECK (
    status IN ('active', 'inactive', 'blocked', 'pending')
  )
);

COMMENT ON TABLE community_members IS 'Miembros de la comunidad Australe con código único';

-- 3. events
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  flyer_url text,
  banner_url text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location_name text,
  address text,
  capacity integer,
  status text NOT NULL DEFAULT 'draft',
  is_featured boolean NOT NULL DEFAULT false,
  external_ticket_url text,
  ticket_sale_mode text NOT NULL DEFAULT 'internal',
  created_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT events_status_check CHECK (
    status IN ('draft', 'published', 'sold_out', 'finished', 'cancelled', 'hidden')
  ),
  CONSTRAINT events_ticket_sale_mode_check CHECK (
    ticket_sale_mode IN ('internal', 'external', 'both', 'disabled')
  )
);

COMMENT ON TABLE events IS 'Eventos publicados y gestionados por Australe';

-- 4. ticket_types
CREATE TABLE ticket_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  public_price numeric(12, 2) NOT NULL DEFAULT 0,
  community_price numeric(12, 2) NOT NULL DEFAULT 0,
  stock_total integer,
  stock_sold integer NOT NULL DEFAULT 0,
  max_per_order integer NOT NULL DEFAULT 10,
  sale_start_at timestamptz,
  sale_end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_types_public_price_check CHECK (public_price >= 0),
  CONSTRAINT ticket_types_community_price_check CHECK (community_price >= 0),
  CONSTRAINT ticket_types_stock_total_check CHECK (
    stock_total IS NULL OR stock_total >= 0
  ),
  CONSTRAINT ticket_types_stock_sold_check CHECK (stock_sold >= 0),
  CONSTRAINT ticket_types_max_per_order_check CHECK (max_per_order > 0)
);

COMMENT ON TABLE ticket_types IS 'Tipos de entrada por evento con precios y stock';

-- 5. tickets
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  ticket_type_id uuid REFERENCES ticket_types (id) ON DELETE SET NULL,
  community_member_id uuid REFERENCES community_members (id) ON DELETE SET NULL,
  buyer_name text NOT NULL,
  buyer_whatsapp text,
  buyer_dni text,
  qr_token text NOT NULL UNIQUE,
  qr_image_url text,
  price_paid numeric(12, 2) NOT NULL DEFAULT 0,
  original_price numeric(12, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  ticket_status text NOT NULL DEFAULT 'reserved',
  sales_channel text NOT NULL DEFAULT 'web',
  reservation_expires_at timestamptz,
  used_at timestamptz,
  used_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  sold_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_payment_method_check CHECK (
    payment_method IN (
      'cash', 'transfer', 'mercadopago_manual', 'card',
      'courtesy', 'external', 'pending'
    )
  ),
  CONSTRAINT tickets_payment_status_check CHECK (
    payment_status IN ('pending', 'confirmed', 'rejected', 'refunded', 'cancelled')
  ),
  CONSTRAINT tickets_ticket_status_check CHECK (
    ticket_status IN ('reserved', 'valid', 'used', 'cancelled', 'expired')
  ),
  CONSTRAINT tickets_sales_channel_check CHECK (
    sales_channel IN ('web', 'admin_manual', 'door', 'external', 'courtesy')
  ),
  CONSTRAINT tickets_price_paid_check CHECK (price_paid >= 0),
  CONSTRAINT tickets_original_price_check CHECK (original_price >= 0),
  CONSTRAINT tickets_discount_amount_check CHECK (discount_amount >= 0)
);

COMMENT ON TABLE tickets IS 'Entradas vendidas o reservadas con QR único';

-- 6. products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE products IS 'Catálogo base de productos (cocina, kiosco, barra)';

-- 7. event_products
CREATE TABLE event_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  public_price numeric(12, 2) NOT NULL DEFAULT 0,
  community_price numeric(12, 2) NOT NULL DEFAULT 0,
  stock_initial integer,
  stock_current integer,
  is_visible boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_products_event_product_unique UNIQUE (event_id, product_id),
  CONSTRAINT event_products_public_price_check CHECK (public_price >= 0),
  CONSTRAINT event_products_community_price_check CHECK (community_price >= 0),
  CONSTRAINT event_products_stock_initial_check CHECK (
    stock_initial IS NULL OR stock_initial >= 0
  ),
  CONSTRAINT event_products_stock_current_check CHECK (
    stock_current IS NULL OR stock_current >= 0
  )
);

COMMENT ON TABLE event_products IS 'Productos habilitados por evento con precio y stock';

-- 8. kiosk_orders
CREATE TABLE kiosk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  order_number integer NOT NULL,
  customer_profile_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  community_member_id uuid REFERENCES community_members (id) ON DELETE SET NULL,
  customer_name text,
  customer_whatsapp text,
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  discount_total numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  cashier_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiosk_orders_status_check CHECK (
    status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')
  ),
  CONSTRAINT kiosk_orders_payment_method_check CHECK (
    payment_method IN (
      'cash', 'transfer', 'mercadopago_manual', 'card',
      'courtesy', 'external', 'pending'
    )
  ),
  CONSTRAINT kiosk_orders_payment_status_check CHECK (
    payment_status IN ('pending', 'confirmed', 'rejected', 'refunded', 'cancelled')
  ),
  CONSTRAINT kiosk_orders_event_order_number_unique UNIQUE (event_id, order_number),
  CONSTRAINT kiosk_orders_subtotal_check CHECK (subtotal >= 0),
  CONSTRAINT kiosk_orders_discount_total_check CHECK (discount_total >= 0),
  CONSTRAINT kiosk_orders_total_check CHECK (total >= 0)
);

COMMENT ON TABLE kiosk_orders IS 'Pedidos de kiosco/cocina/barra por evento';

-- 9. kiosk_order_items
CREATE TABLE kiosk_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES kiosk_orders (id) ON DELETE CASCADE,
  event_product_id uuid REFERENCES event_products (id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  original_unit_price numeric(12, 2) NOT NULL DEFAULT 0,
  discount_amount numeric(12, 2) NOT NULL DEFAULT 0,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiosk_order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT kiosk_order_items_unit_price_check CHECK (unit_price >= 0),
  CONSTRAINT kiosk_order_items_original_unit_price_check CHECK (
    original_unit_price >= 0
  ),
  CONSTRAINT kiosk_order_items_discount_amount_check CHECK (discount_amount >= 0),
  CONSTRAINT kiosk_order_items_subtotal_check CHECK (subtotal >= 0)
);

COMMENT ON TABLE kiosk_order_items IS 'Ítems de cada pedido de kiosco';

-- 10. cash_closures
CREATE TABLE cash_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  closed_by uuid REFERENCES profiles (id) ON DELETE SET NULL,
  total_tickets numeric(12, 2) NOT NULL DEFAULT 0,
  total_kiosk numeric(12, 2) NOT NULL DEFAULT 0,
  total_cash numeric(12, 2) NOT NULL DEFAULT 0,
  total_transfer numeric(12, 2) NOT NULL DEFAULT 0,
  total_mercadopago_manual numeric(12, 2) NOT NULL DEFAULT 0,
  total_card numeric(12, 2) NOT NULL DEFAULT 0,
  total_general numeric(12, 2) NOT NULL DEFAULT 0,
  notes text,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cash_closures IS 'Cierres de caja por evento';

-- 11. audit_logs
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_logs IS 'Registro de acciones administrativas y operativas';

-- -----------------------------------------------------------------------------
-- D) Índices
-- -----------------------------------------------------------------------------

CREATE INDEX idx_events_slug ON events (slug);
CREATE INDEX idx_events_status ON events (status);

CREATE INDEX idx_ticket_types_event_id ON ticket_types (event_id);

CREATE INDEX idx_tickets_event_id ON tickets (event_id);
CREATE INDEX idx_tickets_qr_token ON tickets (qr_token);
CREATE INDEX idx_tickets_ticket_status ON tickets (ticket_status);
CREATE INDEX idx_tickets_payment_status ON tickets (payment_status);

CREATE INDEX idx_community_members_dni ON community_members (dni);
CREATE INDEX idx_community_members_whatsapp ON community_members (whatsapp);

CREATE INDEX idx_event_products_event_id ON event_products (event_id);

CREATE INDEX idx_kiosk_orders_event_id ON kiosk_orders (event_id);
CREATE INDEX idx_kiosk_orders_status ON kiosk_orders (status);

CREATE INDEX idx_kiosk_order_items_order_id ON kiosk_order_items (order_id);

CREATE INDEX idx_audit_logs_user_id ON audit_logs (user_id);

-- -----------------------------------------------------------------------------
-- E) Row Level Security (sin policies en esta versión)
-- -----------------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kiosk_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- F) Triggers updated_at
-- -----------------------------------------------------------------------------

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_community_members_updated_at
  BEFORE UPDATE ON community_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_ticket_types_updated_at
  BEFORE UPDATE ON ticket_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_event_products_updated_at
  BEFORE UPDATE ON event_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_kiosk_orders_updated_at
  BEFORE UPDATE ON kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
