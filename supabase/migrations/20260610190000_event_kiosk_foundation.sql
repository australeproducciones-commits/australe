-- =============================================================================
-- Australe Producciones · ETAPA C.1 — Kiosco / preventa de consumisiones
-- Ejecutar en Supabase → SQL Editor (o vía CLI migrations).
-- Requiere: schema-v1.sql, schema-v1-profile-functions.sql, schema-v1-policies.sql
--
-- Nota: reemplaza kiosk_orders / kiosk_order_items del schema V1 inicial
-- (estructura legacy ligada a event_products) por el modelo C.1.
-- products / event_products se mantienen para lista de precios legacy.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Tablas nuevas: catálogo y configuración por evento
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kiosk_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  image_url text,
  default_price numeric(12, 2),
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiosk_products_slug_unique UNIQUE (slug),
  CONSTRAINT kiosk_products_name_not_empty CHECK (btrim(name) <> ''),
  CONSTRAINT kiosk_products_default_price_check CHECK (
    default_price IS NULL OR default_price >= 0
  )
);

COMMENT ON TABLE public.kiosk_products IS
  'Catálogo maestro de productos del kiosco / consumisiones';

CREATE INDEX IF NOT EXISTS idx_kiosk_products_is_active
  ON public.kiosk_products (is_active);

CREATE INDEX IF NOT EXISTS idx_kiosk_products_category
  ON public.kiosk_products (category);

CREATE TABLE IF NOT EXISTS public.event_kiosk_settings (
  event_id uuid PRIMARY KEY REFERENCES public.events (id) ON DELETE CASCADE,
  presale_enabled boolean NOT NULL DEFAULT false,
  manual_sales_enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.event_kiosk_settings IS
  'Configuración de kiosco y preventa por evento';

CREATE TABLE IF NOT EXISTS public.event_kiosk_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.kiosk_products (id) ON DELETE RESTRICT,
  price numeric(12, 2) NOT NULL,
  stock_total integer,
  stock_sold integer NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_kiosk_products_event_product_unique UNIQUE (event_id, product_id),
  CONSTRAINT event_kiosk_products_price_check CHECK (price >= 0),
  CONSTRAINT event_kiosk_products_stock_total_check CHECK (
    stock_total IS NULL OR stock_total >= 0
  ),
  CONSTRAINT event_kiosk_products_stock_sold_check CHECK (stock_sold >= 0),
  CONSTRAINT event_kiosk_products_stock_sold_lte_total_check CHECK (
    stock_total IS NULL OR stock_sold <= stock_total
  )
);

COMMENT ON TABLE public.event_kiosk_products IS
  'Productos de kiosco habilitados por evento con precio y stock';

CREATE INDEX IF NOT EXISTS idx_event_kiosk_products_event_id
  ON public.event_kiosk_products (event_id);

CREATE INDEX IF NOT EXISTS idx_event_kiosk_products_product_id
  ON public.event_kiosk_products (product_id);

CREATE INDEX IF NOT EXISTS idx_event_kiosk_products_is_available
  ON public.event_kiosk_products (is_available);

CREATE INDEX IF NOT EXISTS idx_event_kiosk_products_sort_order
  ON public.event_kiosk_products (event_id, sort_order);

-- -----------------------------------------------------------------------------
-- B) Reemplazar kiosk_orders / kiosk_order_items (modelo C.1)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS kiosk_orders_admin_all ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_select_customer_own ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_insert_customer_own ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_select ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_insert ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_update ON public.kiosk_orders;

DROP POLICY IF EXISTS kiosk_order_items_admin_all ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_select_customer_own ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_insert_customer_own ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_select ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_insert ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_update ON public.kiosk_order_items;

DROP TRIGGER IF EXISTS set_kiosk_orders_updated_at ON public.kiosk_orders;

DROP TABLE IF EXISTS public.kiosk_order_items CASCADE;
DROP TABLE IF EXISTS public.kiosk_orders CASCADE;

CREATE TABLE public.kiosk_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_whatsapp text,
  buyer_dni text,
  buyer_email text,
  ticket_id uuid REFERENCES public.tickets (id) ON DELETE SET NULL,
  order_code text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'admin',
  payment_status text NOT NULL DEFAULT 'pending',
  pickup_status text NOT NULL DEFAULT 'pending',
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  paid_at timestamptz,
  delivered_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiosk_orders_order_code_unique UNIQUE (order_code),
  CONSTRAINT kiosk_orders_buyer_name_not_empty CHECK (btrim(buyer_name) <> ''),
  CONSTRAINT kiosk_orders_total_amount_check CHECK (total_amount >= 0),
  CONSTRAINT kiosk_orders_source_check CHECK (
    source IN ('admin', 'public', 'manual')
  ),
  CONSTRAINT kiosk_orders_payment_status_check CHECK (
    payment_status IN ('pending', 'paid', 'cancelled', 'refunded')
  ),
  CONSTRAINT kiosk_orders_pickup_status_check CHECK (
    pickup_status IN ('pending', 'ready', 'delivered', 'cancelled')
  )
);

COMMENT ON TABLE public.kiosk_orders IS
  'Órdenes de consumisiones / kiosco por evento (modelo C.1)';

CREATE TABLE public.kiosk_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.kiosk_orders (id) ON DELETE CASCADE,
  event_kiosk_product_id uuid NOT NULL
    REFERENCES public.event_kiosk_products (id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  unit_price numeric(12, 2) NOT NULL,
  quantity integer NOT NULL,
  subtotal numeric(12, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiosk_order_items_product_name_not_empty CHECK (btrim(product_name) <> ''),
  CONSTRAINT kiosk_order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT kiosk_order_items_unit_price_check CHECK (unit_price >= 0),
  CONSTRAINT kiosk_order_items_subtotal_check CHECK (subtotal >= 0)
);

COMMENT ON TABLE public.kiosk_order_items IS
  'Ítems congelados de cada orden de kiosco';

CREATE INDEX idx_kiosk_orders_event_id ON public.kiosk_orders (event_id);
CREATE INDEX idx_kiosk_orders_order_code ON public.kiosk_orders (order_code);
CREATE INDEX idx_kiosk_orders_payment_status ON public.kiosk_orders (payment_status);
CREATE INDEX idx_kiosk_orders_pickup_status ON public.kiosk_orders (pickup_status);
CREATE INDEX idx_kiosk_orders_ticket_id ON public.kiosk_orders (ticket_id);
CREATE INDEX idx_kiosk_orders_created_at ON public.kiosk_orders (created_at DESC);

CREATE INDEX idx_kiosk_order_items_order_id ON public.kiosk_order_items (order_id);
CREATE INDEX idx_kiosk_order_items_event_kiosk_product_id
  ON public.kiosk_order_items (event_kiosk_product_id);

-- -----------------------------------------------------------------------------
-- C) Triggers updated_at (reutiliza update_updated_at_column existente)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_kiosk_products_updated_at ON public.kiosk_products;
CREATE TRIGGER set_kiosk_products_updated_at
  BEFORE UPDATE ON public.kiosk_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_event_kiosk_settings_updated_at ON public.event_kiosk_settings;
CREATE TRIGGER set_event_kiosk_settings_updated_at
  BEFORE UPDATE ON public.event_kiosk_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_event_kiosk_products_updated_at ON public.event_kiosk_products;
CREATE TRIGGER set_event_kiosk_products_updated_at
  BEFORE UPDATE ON public.event_kiosk_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_kiosk_orders_updated_at ON public.kiosk_orders;
CREATE TRIGGER set_kiosk_orders_updated_at
  BEFORE UPDATE ON public.kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- D) order_code automático
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_kiosk_order_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_attempts integer := 0;
BEGIN
  IF NEW.order_code IS NOT NULL AND btrim(NEW.order_code) <> '' THEN
    NEW.order_code := btrim(NEW.order_code);
    RETURN NEW;
  END IF;

  LOOP
    v_attempts := v_attempts + 1;
    v_code := 'KIO-' || upper(substring(replace(gen_random_uuid()::text, '-', '') FROM 1 FOR 6));

    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.kiosk_orders ko
      WHERE ko.order_code = v_code
    );

    IF v_attempts > 25 THEN
      RAISE EXCEPTION 'generate_kiosk_order_code: no se pudo generar código único';
    END IF;
  END LOOP;

  NEW.order_code := v_code;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_kiosk_order_code ON public.kiosk_orders;
CREATE TRIGGER trg_generate_kiosk_order_code
  BEFORE INSERT ON public.kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_kiosk_order_code();

-- -----------------------------------------------------------------------------
-- E) Recalcular total de orden desde ítems
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.recalculate_kiosk_order_total(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.kiosk_orders ko
  SET total_amount = COALESCE((
    SELECT SUM(koi.subtotal)
    FROM public.kiosk_order_items koi
    WHERE koi.order_id = p_order_id
  ), 0)
  WHERE ko.id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_recalculate_kiosk_order_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_kiosk_order_total(
    COALESCE(NEW.order_id, OLD.order_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_kiosk_order_items_recalc_total_insert
  ON public.kiosk_order_items;
DROP TRIGGER IF EXISTS trg_kiosk_order_items_recalc_total_update
  ON public.kiosk_order_items;
DROP TRIGGER IF EXISTS trg_kiosk_order_items_recalc_total_delete
  ON public.kiosk_order_items;

CREATE TRIGGER trg_kiosk_order_items_recalc_total_insert
  AFTER INSERT ON public.kiosk_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalculate_kiosk_order_total();

CREATE TRIGGER trg_kiosk_order_items_recalc_total_update
  AFTER UPDATE ON public.kiosk_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalculate_kiosk_order_total();

CREATE TRIGGER trg_kiosk_order_items_recalc_total_delete
  AFTER DELETE ON public.kiosk_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_recalculate_kiosk_order_total();

-- -----------------------------------------------------------------------------
-- F) Stock: reservar / liberar (RPC preparada para C.2)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reserve_event_kiosk_stock(
  p_event_kiosk_product_id uuid,
  p_quantity integer
)
RETURNS public.event_kiosk_products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.event_kiosk_products;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'reserve_event_kiosk_stock: usuario no autenticado';
  END IF;

  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'reserve_event_kiosk_stock: permiso denegado';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'reserve_event_kiosk_stock: cantidad inválida';
  END IF;

  SELECT *
  INTO v_row
  FROM public.event_kiosk_products
  WHERE id = p_event_kiosk_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reserve_event_kiosk_stock: producto no encontrado';
  END IF;

  IF NOT v_row.is_available THEN
    RAISE EXCEPTION 'reserve_event_kiosk_stock: producto no disponible';
  END IF;

  IF v_row.stock_total IS NOT NULL
    AND (v_row.stock_sold + p_quantity) > v_row.stock_total THEN
    RAISE EXCEPTION 'reserve_event_kiosk_stock: stock insuficiente';
  END IF;

  UPDATE public.event_kiosk_products
  SET stock_sold = stock_sold + p_quantity
  WHERE id = p_event_kiosk_product_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_event_kiosk_stock(
  p_event_kiosk_product_id uuid,
  p_quantity integer
)
RETURNS public.event_kiosk_products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.event_kiosk_products;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'release_event_kiosk_stock: usuario no autenticado';
  END IF;

  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'release_event_kiosk_stock: permiso denegado';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'release_event_kiosk_stock: cantidad inválida';
  END IF;

  SELECT *
  INTO v_row
  FROM public.event_kiosk_products
  WHERE id = p_event_kiosk_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'release_event_kiosk_stock: producto no encontrado';
  END IF;

  UPDATE public.event_kiosk_products
  SET stock_sold = GREATEST(0, stock_sold - p_quantity)
  WHERE id = p_event_kiosk_product_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.reserve_event_kiosk_stock(uuid, integer) IS
  'Incrementa stock_sold con bloqueo FOR UPDATE. Admin o cajero.';

COMMENT ON FUNCTION public.release_event_kiosk_stock(uuid, integer) IS
  'Decrementa stock_sold sin bajar de 0. Admin o cajero. Para cancelaciones.';

REVOKE ALL ON FUNCTION public.recalculate_kiosk_order_total(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_event_kiosk_stock(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_event_kiosk_stock(uuid, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.recalculate_kiosk_order_total(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_event_kiosk_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_event_kiosk_stock(uuid, integer) TO authenticated;

-- -----------------------------------------------------------------------------
-- G) RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.kiosk_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_kiosk_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_kiosk_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_order_items ENABLE ROW LEVEL SECURITY;

-- kiosk_products
DROP POLICY IF EXISTS kiosk_products_admin_all ON public.kiosk_products;
DROP POLICY IF EXISTS kiosk_products_select_public_active ON public.kiosk_products;

CREATE POLICY kiosk_products_admin_all
  ON public.kiosk_products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY kiosk_products_select_public_active
  ON public.kiosk_products
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- event_kiosk_settings
DROP POLICY IF EXISTS event_kiosk_settings_admin_all ON public.event_kiosk_settings;
DROP POLICY IF EXISTS event_kiosk_settings_select_public_presale ON public.event_kiosk_settings;

CREATE POLICY event_kiosk_settings_admin_all
  ON public.event_kiosk_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY event_kiosk_settings_select_public_presale
  ON public.event_kiosk_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    presale_enabled = true
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_kiosk_settings.event_id
        AND e.status = 'published'
    )
  );

-- event_kiosk_products
DROP POLICY IF EXISTS event_kiosk_products_admin_all ON public.event_kiosk_products;
DROP POLICY IF EXISTS event_kiosk_products_select_public_available ON public.event_kiosk_products;
DROP POLICY IF EXISTS event_kiosk_products_select_cashier ON public.event_kiosk_products;

CREATE POLICY event_kiosk_products_admin_all
  ON public.event_kiosk_products
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY event_kiosk_products_select_public_available
  ON public.event_kiosk_products
  FOR SELECT
  TO anon, authenticated
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_kiosk_products.event_id
        AND e.status = 'published'
    )
    AND EXISTS (
      SELECT 1
      FROM public.event_kiosk_settings eks
      WHERE eks.event_id = event_kiosk_products.event_id
        AND eks.presale_enabled = true
    )
  );

CREATE POLICY event_kiosk_products_select_cashier
  ON public.event_kiosk_products
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

-- kiosk_orders (sin compra pública en C.1)
DROP POLICY IF EXISTS kiosk_orders_admin_all ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_select ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_insert ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_update ON public.kiosk_orders;

CREATE POLICY kiosk_orders_admin_all
  ON public.kiosk_orders
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY kiosk_orders_cashier_select
  ON public.kiosk_orders
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY kiosk_orders_cashier_insert
  ON public.kiosk_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

CREATE POLICY kiosk_orders_cashier_update
  ON public.kiosk_orders
  FOR UPDATE
  TO authenticated
  USING (public.is_cashier())
  WITH CHECK (public.is_cashier());

-- kiosk_order_items
DROP POLICY IF EXISTS kiosk_order_items_admin_all ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_select ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_insert ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_update ON public.kiosk_order_items;

CREATE POLICY kiosk_order_items_admin_all
  ON public.kiosk_order_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY kiosk_order_items_cashier_select
  ON public.kiosk_order_items
  FOR SELECT
  TO authenticated
  USING (public.is_cashier());

CREATE POLICY kiosk_order_items_cashier_insert
  ON public.kiosk_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier());

CREATE POLICY kiosk_order_items_cashier_update
  ON public.kiosk_order_items
  FOR UPDATE
  TO authenticated
  USING (public.is_cashier())
  WITH CHECK (public.is_cashier());

-- -----------------------------------------------------------------------------
-- H) GRANTs de tablas
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.kiosk_products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_products TO authenticated;

GRANT SELECT ON public.event_kiosk_settings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_kiosk_settings TO authenticated;

GRANT SELECT ON public.event_kiosk_products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_kiosk_products TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kiosk_order_items TO authenticated;

COMMENT ON TABLE public.kiosk_products IS
  'RLS: público SELECT activos; admin CRUD. Compra pública catálogo en C.3.';

COMMENT ON TABLE public.event_kiosk_settings IS
  'RLS: público SELECT si presale_enabled y evento publicado; admin CRUD';

COMMENT ON TABLE public.event_kiosk_products IS
  'RLS: público SELECT disponibles con preventa; cashier SELECT; admin CRUD';

COMMENT ON TABLE public.kiosk_orders IS
  'RLS C.1: admin todo; cashier operación. Sin INSERT customer hasta C.3';

COMMENT ON TABLE public.kiosk_order_items IS
  'RLS C.1: admin todo; cashier operación. Sin INSERT customer hasta C.3';
