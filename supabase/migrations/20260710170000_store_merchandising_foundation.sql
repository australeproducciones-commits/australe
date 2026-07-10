-- =============================================================================
-- Australe · Módulo Tienda / Merchandising (dominio separado del kiosco)
-- Tablas: store_products, variants, collections, event associations, orders, stock
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensión community_settings para puntos de tienda
-- -----------------------------------------------------------------------------

ALTER TABLE public.community_settings
  ADD COLUMN IF NOT EXISTS store_points_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.community_settings.store_points_enabled IS
  'Acreditar puntos por pedidos de tienda/merch confirmados.';

-- -----------------------------------------------------------------------------
-- 2. store_products
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  short_description text,
  sku text,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'draft',
  public_price numeric(12, 2) NOT NULL DEFAULT 0 CHECK (public_price >= 0),
  community_price numeric(12, 2) CHECK (community_price IS NULL OR community_price >= 0),
  cost_price numeric(12, 2) CHECK (cost_price IS NULL OR cost_price >= 0),
  main_image_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  community_only boolean NOT NULL DEFAULT false,
  track_stock boolean NOT NULL DEFAULT true,
  stock_total integer NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
  stock_reserved integer NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
  stock_sold integer NOT NULL DEFAULT 0 CHECK (stock_sold >= 0),
  max_per_order integer CHECK (max_per_order IS NULL OR max_per_order > 0),
  available_from timestamptz,
  available_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_products_status_check CHECK (
    status IN ('draft', 'active', 'inactive', 'archived')
  ),
  CONSTRAINT store_products_stock_reserved_lte_total CHECK (
  stock_reserved <= stock_total
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS store_products_slug_unique ON public.store_products (slug);
CREATE UNIQUE INDEX IF NOT EXISTS store_products_sku_unique
  ON public.store_products (sku) WHERE sku IS NOT NULL AND sku <> '';
CREATE INDEX IF NOT EXISTS store_products_status_active_idx
  ON public.store_products (status, is_active);
CREATE INDEX IF NOT EXISTS store_products_category_idx ON public.store_products (category);
CREATE INDEX IF NOT EXISTS store_products_featured_idx
  ON public.store_products (is_featured) WHERE is_featured = true;

-- -----------------------------------------------------------------------------
-- 3. store_product_variants
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products (id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  size text,
  color text,
  model text,
  price_override numeric(12, 2) CHECK (price_override IS NULL OR price_override >= 0),
  community_price_override numeric(12, 2)
    CHECK (community_price_override IS NULL OR community_price_override >= 0),
  stock_total integer NOT NULL DEFAULT 0 CHECK (stock_total >= 0),
  stock_reserved integer NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
  stock_sold integer NOT NULL DEFAULT 0 CHECK (stock_sold >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_variants_stock_reserved_lte_total CHECK (
    stock_reserved <= stock_total
  )
);

CREATE INDEX IF NOT EXISTS store_product_variants_product_idx
  ON public.store_product_variants (product_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS store_product_variants_sku_unique
  ON public.store_product_variants (sku) WHERE sku IS NOT NULL AND sku <> '';

-- -----------------------------------------------------------------------------
-- 4. store_collections
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_collections_slug_unique ON public.store_collections (slug);

CREATE TABLE IF NOT EXISTS public.store_collection_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.store_collections (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, product_id)
);

CREATE INDEX IF NOT EXISTS store_collection_products_collection_idx
  ON public.store_collection_products (collection_id, sort_order);

-- -----------------------------------------------------------------------------
-- 5. event_store_settings
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_store_settings (
  event_id uuid PRIMARY KEY REFERENCES public.events (id) ON DELETE CASCADE,
  merchandising_enabled boolean NOT NULL DEFAULT false,
  show_badge boolean NOT NULL DEFAULT true,
  badge_text text NOT NULL DEFAULT 'MERCH DISPONIBLE',
  show_products_block boolean NOT NULL DEFAULT true,
  pickup_enabled boolean NOT NULL DEFAULT true,
  pickup_instructions text,
  max_featured_products integer NOT NULL DEFAULT 3
    CHECK (max_featured_products >= 0 AND max_featured_products <= 12),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 6. event_store_products
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products (id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  event_price_override numeric(12, 2) CHECK (event_price_override IS NULL OR event_price_override >= 0),
  event_community_price_override numeric(12, 2)
    CHECK (event_community_price_override IS NULL OR event_community_price_override >= 0),
  pickup_available boolean NOT NULL DEFAULT true,
  pickup_instructions text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, product_id)
);

CREATE INDEX IF NOT EXISTS event_store_products_event_idx
  ON public.event_store_products (event_id, sort_order);
CREATE INDEX IF NOT EXISTS event_store_products_product_idx
  ON public.event_store_products (product_id);

-- -----------------------------------------------------------------------------
-- 7. store_orders
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_provider text,
  payment_reference text,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  points_discount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (points_discount >= 0),
  total numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  pickup_method text NOT NULL DEFAULT 'event',
  pickup_event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  pickup_instructions text,
  pickup_code text,
  pickup_token_hash text,
  reserved_until timestamptz,
  paid_at timestamptz,
  prepared_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  delivered_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  cancelled_at timestamptz,
  loyalty_points_awarded integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_orders_status_check CHECK (
    status IN (
      'pending', 'reserved', 'paid', 'preparing', 'ready',
      'delivered', 'cancelled', 'expired', 'refunded'
    )
  ),
  CONSTRAINT store_orders_payment_status_check CHECK (
    payment_status IN ('pending', 'confirmed', 'failed', 'refunded', 'cancelled')
  ),
  CONSTRAINT store_orders_pickup_method_check CHECK (
    pickup_method IN ('event', 'pickup_point', 'shipping_future')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS store_orders_order_number_unique
  ON public.store_orders (order_number);
CREATE INDEX IF NOT EXISTS store_orders_user_idx ON public.store_orders (user_id);
CREATE INDEX IF NOT EXISTS store_orders_event_idx ON public.store_orders (event_id);
CREATE INDEX IF NOT EXISTS store_orders_status_idx ON public.store_orders (status);
CREATE INDEX IF NOT EXISTS store_orders_pickup_code_idx
  ON public.store_orders (pickup_code) WHERE pickup_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_orders_reserved_until_idx
  ON public.store_orders (reserved_until)
  WHERE status IN ('pending', 'reserved') AND reserved_until IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 8. store_order_items
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.store_orders (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.store_products (id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.store_product_variants (id) ON DELETE RESTRICT,
  product_name_snapshot text NOT NULL,
  variant_name_snapshot text,
  sku_snapshot text,
  unit_price numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  subtotal numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  community_price_applied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_order_items_order_idx ON public.store_order_items (order_id);

-- -----------------------------------------------------------------------------
-- 9. store_stock_movements
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products (id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.store_product_variants (id) ON DELETE RESTRICT,
  order_id uuid REFERENCES public.store_orders (id) ON DELETE SET NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity integer NOT NULL,
  previous_stock integer NOT NULL,
  new_stock integer NOT NULL,
  reason text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_stock_movements_type_check CHECK (
    movement_type IN (
      'ingreso', 'reserva', 'liberacion_reserva', 'venta',
      'cancelacion', 'devolucion', 'ajuste_positivo', 'ajuste_negativo'
    )
  )
);

CREATE INDEX IF NOT EXISTS store_stock_movements_product_idx
  ON public.store_stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS store_stock_movements_order_idx
  ON public.store_stock_movements (order_id);

-- -----------------------------------------------------------------------------
-- 10. updated_at triggers
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'store_products',
    'store_product_variants',
    'store_collections',
    'event_store_settings',
    'event_store_products',
    'store_orders',
    'store_order_items'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_updated_at ON public.%I',
      t, t
    );
    EXECUTE format(
      'CREATE TRIGGER %I_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.store_set_updated_at()',
      t, t
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 11. order_number generator
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_store_order_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  LOOP
    v_code := 'STO-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.store_orders WHERE order_number = v_code
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 20 THEN
      RAISE EXCEPTION 'generate_store_order_number: no se pudo generar código único';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_store_pickup_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::integer, 1);
  END LOOP;
  RETURN v_code;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. Helpers de disponibilidad pública
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_product_is_publicly_available(
  p_product public.store_products,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    p_product.is_active
    AND p_product.status = 'active'
    AND (p_product.available_from IS NULL OR p_product.available_from <= p_now)
    AND (p_product.available_until IS NULL OR p_product.available_until >= p_now);
$$;

CREATE OR REPLACE FUNCTION public.store_variant_available_qty(
  p_variant public.store_product_variants,
  p_product public.store_products
)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NOT p_product.track_stock THEN 999999
    WHEN p_variant.id IS NOT NULL THEN GREATEST(0, p_variant.stock_total - p_variant.stock_reserved)
    ELSE GREATEST(0, p_product.stock_total - p_product.stock_reserved)
  END;
$$;

CREATE OR REPLACE FUNCTION public.event_has_available_store_merch(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.event_store_settings ess
    JOIN public.events e ON e.id = ess.event_id
    JOIN public.event_store_products esp ON esp.event_id = ess.event_id
    JOIN public.store_products sp ON sp.id = esp.product_id
    WHERE ess.event_id = p_event_id
      AND ess.merchandising_enabled = true
      AND ess.show_badge = true
      AND e.status = 'published'
      AND esp.is_active = true
      AND public.store_product_is_publicly_available(sp)
      AND (esp.starts_at IS NULL OR esp.starts_at <= now())
      AND (esp.ends_at IS NULL OR esp.ends_at >= now())
      AND (
        NOT sp.track_stock
        OR EXISTS (
          SELECT 1
          FROM public.store_product_variants v
          WHERE v.product_id = sp.id
            AND v.is_active = true
            AND (v.stock_total - v.stock_reserved) > 0
        )
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.store_product_variants v
            WHERE v.product_id = sp.id AND v.is_active = true
          )
          AND (sp.stock_total - sp.stock_reserved) > 0
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.event_has_available_store_merch(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_has_available_store_merch(uuid) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 13. RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_stock_movements ENABLE ROW LEVEL SECURITY;

-- store_products
DROP POLICY IF EXISTS store_products_public_select ON public.store_products;
CREATE POLICY store_products_public_select ON public.store_products
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND status = 'active'
    AND (community_only = false OR auth.uid() IS NOT NULL)
  );

DROP POLICY IF EXISTS store_products_admin_all ON public.store_products;
CREATE POLICY store_products_admin_all ON public.store_products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- store_product_variants
DROP POLICY IF EXISTS store_variants_public_select ON public.store_product_variants;
CREATE POLICY store_variants_public_select ON public.store_product_variants
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_products p
      WHERE p.id = product_id
        AND p.is_active = true
        AND p.status = 'active'
    )
  );

DROP POLICY IF EXISTS store_variants_admin_all ON public.store_product_variants;
CREATE POLICY store_variants_admin_all ON public.store_product_variants
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- store_collections
DROP POLICY IF EXISTS store_collections_public_select ON public.store_collections;
CREATE POLICY store_collections_public_select ON public.store_collections
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS store_collections_admin_all ON public.store_collections;
CREATE POLICY store_collections_admin_all ON public.store_collections
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS store_collection_products_public_select ON public.store_collection_products;
CREATE POLICY store_collection_products_public_select ON public.store_collection_products
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS store_collection_products_admin_all ON public.store_collection_products;
CREATE POLICY store_collection_products_admin_all ON public.store_collection_products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- event_store_settings
DROP POLICY IF EXISTS event_store_settings_public_select ON public.event_store_settings;
CREATE POLICY event_store_settings_public_select ON public.event_store_settings
  FOR SELECT TO anon, authenticated
  USING (
    merchandising_enabled = true
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS event_store_settings_admin_all ON public.event_store_settings;
CREATE POLICY event_store_settings_admin_all ON public.event_store_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- event_store_products
DROP POLICY IF EXISTS event_store_products_public_select ON public.event_store_products;
CREATE POLICY event_store_products_public_select ON public.event_store_products
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.event_store_settings ess
      JOIN public.events e ON e.id = ess.event_id
      WHERE ess.event_id = event_store_products.event_id
        AND ess.merchandising_enabled = true
        AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS event_store_products_admin_all ON public.event_store_products;
CREATE POLICY event_store_products_admin_all ON public.event_store_products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- store_orders
DROP POLICY IF EXISTS store_orders_owner_select ON public.store_orders;
CREATE POLICY store_orders_owner_select ON public.store_orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS store_orders_staff_select ON public.store_orders;
CREATE POLICY store_orders_staff_select ON public.store_orders
  FOR SELECT TO authenticated
  USING (
    public.is_cashier()
    AND pickup_event_id IS NOT NULL
    AND public.staff_has_event_access(pickup_event_id)
  );

DROP POLICY IF EXISTS store_orders_admin_all ON public.store_orders;
CREATE POLICY store_orders_admin_all ON public.store_orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- store_order_items
DROP POLICY IF EXISTS store_order_items_owner_select ON public.store_order_items;
CREATE POLICY store_order_items_owner_select ON public.store_order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid() OR public.is_admin())
    )
    OR (
      public.is_cashier()
      AND EXISTS (
        SELECT 1 FROM public.store_orders o
        WHERE o.id = order_id
          AND o.pickup_event_id IS NOT NULL
          AND public.staff_has_event_access(o.pickup_event_id)
      )
    )
  );

DROP POLICY IF EXISTS store_order_items_admin_all ON public.store_order_items;
CREATE POLICY store_order_items_admin_all ON public.store_order_items
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- store_stock_movements
DROP POLICY IF EXISTS store_stock_movements_admin_select ON public.store_stock_movements;
CREATE POLICY store_stock_movements_admin_select ON public.store_stock_movements
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_cashier());

DROP POLICY IF EXISTS store_stock_movements_admin_insert ON public.store_stock_movements;
CREATE POLICY store_stock_movements_admin_insert ON public.store_stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Revocar acceso directo de escritura en tablas críticas
REVOKE INSERT, UPDATE, DELETE ON public.store_orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.store_order_items FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.store_stock_movements FROM anon, authenticated;

GRANT SELECT ON public.store_products TO anon, authenticated;
GRANT SELECT ON public.store_product_variants TO anon, authenticated;
GRANT SELECT ON public.store_collections TO anon, authenticated;
GRANT SELECT ON public.store_collection_products TO anon, authenticated;
GRANT SELECT ON public.event_store_settings TO anon, authenticated;
GRANT SELECT ON public.event_store_products TO anon, authenticated;
GRANT SELECT ON public.store_orders TO authenticated;
GRANT SELECT ON public.store_order_items TO authenticated;
