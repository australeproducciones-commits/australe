-- =============================================================================
-- Australe Producciones · Inventario central de productos / consumiciones
-- Extiende kiosk_products (catálogo global) y event_kiosk_products (config por evento).
-- No elimina columnas legacy (stock_total, stock_sold, category text, default_price).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Categorías de productos
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kiosk_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiosk_product_categories_name_not_empty CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_kiosk_product_categories_name_lower
  ON public.kiosk_product_categories (lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_kiosk_product_categories_active_sort
  ON public.kiosk_product_categories (is_active, sort_order);

COMMENT ON TABLE public.kiosk_product_categories IS
  'Categorías del catálogo global de consumiciones';

INSERT INTO public.kiosk_product_categories (name, sort_order)
SELECT v.name, v.sort_order
FROM (
  VALUES
    ('Bebidas sin alcohol', 10),
    ('Bebidas con alcohol', 20),
    ('Comidas', 30),
    ('Snacks', 40),
    ('Combos', 50),
    ('Merchandising', 60),
    ('Otros', 70)
) AS v(name, sort_order)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.kiosk_product_categories c
  WHERE lower(btrim(c.name)) = lower(btrim(v.name))
);

-- -----------------------------------------------------------------------------
-- B) Extender kiosk_products (inventario central)
-- -----------------------------------------------------------------------------

ALTER TABLE public.kiosk_products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.kiosk_product_categories (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT 'unidad',
  ADD COLUMN IF NOT EXISTS stock_on_hand integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_reserved integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer;

ALTER TABLE public.kiosk_products
  DROP CONSTRAINT IF EXISTS kiosk_products_stock_on_hand_check;

ALTER TABLE public.kiosk_products
  ADD CONSTRAINT kiosk_products_stock_on_hand_check CHECK (stock_on_hand >= 0);

ALTER TABLE public.kiosk_products
  DROP CONSTRAINT IF EXISTS kiosk_products_stock_reserved_check;

ALTER TABLE public.kiosk_products
  ADD CONSTRAINT kiosk_products_stock_reserved_check CHECK (stock_reserved >= 0);

ALTER TABLE public.kiosk_products
  DROP CONSTRAINT IF EXISTS kiosk_products_stock_reserved_lte_on_hand_check;

ALTER TABLE public.kiosk_products
  ADD CONSTRAINT kiosk_products_stock_reserved_lte_on_hand_check CHECK (
    stock_reserved <= stock_on_hand
  );

ALTER TABLE public.kiosk_products
  DROP CONSTRAINT IF EXISTS kiosk_products_low_stock_threshold_check;

ALTER TABLE public.kiosk_products
  ADD CONSTRAINT kiosk_products_low_stock_threshold_check CHECK (
    low_stock_threshold IS NULL OR low_stock_threshold >= 0
  );

ALTER TABLE public.kiosk_products
  DROP CONSTRAINT IF EXISTS kiosk_products_unit_not_empty;

ALTER TABLE public.kiosk_products
  ADD CONSTRAINT kiosk_products_unit_not_empty CHECK (btrim(unit) <> '');

CREATE UNIQUE INDEX IF NOT EXISTS idx_kiosk_products_sku_unique
  ON public.kiosk_products (lower(btrim(sku)))
  WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE INDEX IF NOT EXISTS idx_kiosk_products_category_id
  ON public.kiosk_products (category_id);

CREATE INDEX IF NOT EXISTS idx_kiosk_products_stock
  ON public.kiosk_products (is_active, stock_on_hand, stock_reserved);

-- Migrar category text → category_id cuando coincida por nombre
UPDATE public.kiosk_products kp
SET category_id = c.id
FROM public.kiosk_product_categories c
WHERE kp.category_id IS NULL
  AND kp.category IS NOT NULL
  AND lower(btrim(kp.category)) = lower(btrim(c.name));

UPDATE public.kiosk_products kp
SET category_id = (
  SELECT id FROM public.kiosk_product_categories
  WHERE lower(name) = 'otros'
  LIMIT 1
)
WHERE kp.category_id IS NULL;

-- Inicializar stock_on_hand desde el último evento con stock_total definido
UPDATE public.kiosk_products kp
SET stock_on_hand = GREATEST(0, sub.remaining)
FROM (
  SELECT DISTINCT ON (ekp.product_id)
    ekp.product_id,
    COALESCE(ekp.stock_total, 0) - ekp.stock_sold AS remaining
  FROM public.event_kiosk_products ekp
  WHERE ekp.stock_total IS NOT NULL
  ORDER BY ekp.product_id, ekp.updated_at DESC
) sub
WHERE kp.id = sub.product_id
  AND kp.stock_on_hand = 0;

-- Reservar stock de órdenes pendientes existentes
UPDATE public.kiosk_products kp
SET stock_reserved = sub.qty
FROM (
  SELECT
    ekp.product_id,
    SUM(koi.quantity)::integer AS qty
  FROM public.kiosk_order_items koi
  INNER JOIN public.kiosk_orders ko ON ko.id = koi.order_id
  INNER JOIN public.event_kiosk_products ekp ON ekp.id = koi.event_kiosk_product_id
  WHERE ko.payment_status = 'pending'
    AND ko.pickup_status <> 'cancelled'
  GROUP BY ekp.product_id
) sub
WHERE kp.id = sub.product_id;

-- Ajustar on_hand restando ventas ya confirmadas (paid) no reflejadas
UPDATE public.kiosk_products kp
SET stock_on_hand = GREATEST(
  kp.stock_on_hand - GREATEST(0, sub.paid_qty - kp.stock_reserved),
  kp.stock_reserved
)
FROM (
  SELECT
    ekp.product_id,
    SUM(koi.quantity)::integer AS paid_qty
  FROM public.kiosk_order_items koi
  INNER JOIN public.kiosk_orders ko ON ko.id = koi.order_id
  INNER JOIN public.event_kiosk_products ekp ON ekp.id = koi.event_kiosk_product_id
  WHERE ko.payment_status = 'paid'
  GROUP BY ekp.product_id
) sub
WHERE kp.id = sub.product_id;

-- -----------------------------------------------------------------------------
-- C) Extender event_kiosk_products (config por evento, sin stock propio)
-- -----------------------------------------------------------------------------

ALTER TABLE public.event_kiosk_products
  ADD COLUMN IF NOT EXISTS community_price numeric(12, 2),
  ADD COLUMN IF NOT EXISTS presale_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS qr_sale_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cashier_sale_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_per_order integer;

ALTER TABLE public.event_kiosk_products
  DROP CONSTRAINT IF EXISTS event_kiosk_products_community_price_check;

ALTER TABLE public.event_kiosk_products
  ADD CONSTRAINT event_kiosk_products_community_price_check CHECK (
    community_price IS NULL OR community_price >= 0
  );

ALTER TABLE public.event_kiosk_products
  DROP CONSTRAINT IF EXISTS event_kiosk_products_max_per_order_check;

ALTER TABLE public.event_kiosk_products
  ADD CONSTRAINT event_kiosk_products_max_per_order_check CHECK (
    max_per_order IS NULL OR max_per_order > 0
  );

-- -----------------------------------------------------------------------------
-- D) Extender event_kiosk_settings y kiosk_order_items
-- -----------------------------------------------------------------------------

ALTER TABLE public.event_kiosk_settings
  ADD COLUMN IF NOT EXISTS qr_sale_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_price_list boolean NOT NULL DEFAULT true;

ALTER TABLE public.kiosk_order_items
  ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.kiosk_products (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS community_price_applied numeric(12, 2);

-- Backfill product_id en ítems existentes
UPDATE public.kiosk_order_items koi
SET product_id = ekp.product_id
FROM public.event_kiosk_products ekp
WHERE koi.product_id IS NULL
  AND koi.event_kiosk_product_id = ekp.id;

-- -----------------------------------------------------------------------------
-- E) Movimientos de stock
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.kiosk_product_stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.kiosk_products (id) ON DELETE RESTRICT,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.kiosk_orders (id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.kiosk_order_items (id) ON DELETE SET NULL,
  movement_type text NOT NULL,
  quantity_delta integer NOT NULL,
  previous_stock_on_hand integer NOT NULL,
  resulting_stock_on_hand integer NOT NULL,
  previous_stock_reserved integer,
  resulting_stock_reserved integer,
  reason text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kiosk_product_stock_movements_type_check CHECK (
    movement_type IN (
      'initial_stock',
      'restock',
      'manual_increase',
      'manual_decrease',
      'sale',
      'reservation',
      'reservation_release',
      'sale_confirmation',
      'sale_cancellation',
      'refund',
      'damage',
      'loss',
      'internal_consumption',
      'correction'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_kiosk_stock_movements_product_id
  ON public.kiosk_product_stock_movements (product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiosk_stock_movements_event_id
  ON public.kiosk_product_stock_movements (event_id);

CREATE INDEX IF NOT EXISTS idx_kiosk_stock_movements_order_id
  ON public.kiosk_product_stock_movements (order_id);

-- -----------------------------------------------------------------------------
-- F) Triggers updated_at
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_kiosk_product_categories_updated_at ON public.kiosk_product_categories;

CREATE TRIGGER set_kiosk_product_categories_updated_at
  BEFORE UPDATE ON public.kiosk_product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- G) RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.kiosk_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_product_stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kiosk_product_categories_admin_all ON public.kiosk_product_categories;
CREATE POLICY kiosk_product_categories_admin_all ON public.kiosk_product_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS kiosk_product_categories_public_select ON public.kiosk_product_categories;
CREATE POLICY kiosk_product_categories_public_select ON public.kiosk_product_categories
  FOR SELECT TO authenticated, anon
  USING (is_active = true);

DROP POLICY IF EXISTS kiosk_stock_movements_admin_all ON public.kiosk_product_stock_movements;
CREATE POLICY kiosk_stock_movements_admin_all ON public.kiosk_product_stock_movements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS kiosk_stock_movements_cashier_select ON public.kiosk_product_stock_movements;
CREATE POLICY kiosk_stock_movements_cashier_select ON public.kiosk_product_stock_movements
  FOR SELECT TO authenticated
  USING (public.is_cashier() OR public.is_admin());

-- -----------------------------------------------------------------------------
-- H) Helpers de stock
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_kiosk_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity_delta integer,
  p_previous_on_hand integer,
  p_resulting_on_hand integer,
  p_previous_reserved integer DEFAULT NULL,
  p_resulting_reserved integer DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_order_item_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.kiosk_product_stock_movements (
    product_id,
    event_id,
    order_id,
    order_item_id,
    movement_type,
    quantity_delta,
    previous_stock_on_hand,
    resulting_stock_on_hand,
    previous_stock_reserved,
    resulting_stock_reserved,
    reason,
    created_by
  )
  VALUES (
    p_product_id,
    p_event_id,
    p_order_id,
    p_order_item_id,
    p_movement_type,
    p_quantity_delta,
    p_previous_on_hand,
    p_resulting_on_hand,
    p_previous_reserved,
    p_resulting_reserved,
    NULLIF(btrim(p_reason), ''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_kiosk_product_stock(
  p_product_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_reason text
)
RETURNS TABLE (
  product_id uuid,
  stock_on_hand integer,
  stock_reserved integer,
  stock_available integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.kiosk_products;
  v_delta integer;
  v_prev_on_hand integer;
  v_prev_reserved integer;
  v_new_on_hand integer;
  v_reason text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'adjust_kiosk_product_stock: permiso denegado';
  END IF;

  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'adjust_kiosk_product_stock: cantidad inválida';
  END IF;

  v_reason := NULLIF(btrim(p_reason), '');

  IF p_movement_type NOT IN (
    'restock', 'manual_increase', 'manual_decrease',
    'damage', 'loss', 'internal_consumption', 'correction'
  ) THEN
    RAISE EXCEPTION 'adjust_kiosk_product_stock: tipo de movimiento inválido';
  END IF;

  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'adjust_kiosk_product_stock: motivo requerido';
  END IF;

  SELECT *
  INTO v_product
  FROM public.kiosk_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'adjust_kiosk_product_stock: producto no encontrado';
  END IF;

  v_prev_on_hand := v_product.stock_on_hand;
  v_prev_reserved := v_product.stock_reserved;

  IF p_movement_type IN ('restock', 'manual_increase', 'correction') THEN
    v_delta := p_quantity;
    v_new_on_hand := v_prev_on_hand + v_delta;
  ELSE
    v_delta := -p_quantity;
    v_new_on_hand := v_prev_on_hand - p_quantity;

    IF v_new_on_hand < v_prev_reserved THEN
      RAISE EXCEPTION 'adjust_kiosk_product_stock: stock insuficiente';
    END IF;
  END IF;

  IF v_new_on_hand < 0 THEN
    RAISE EXCEPTION 'adjust_kiosk_product_stock: stock insuficiente';
  END IF;

  UPDATE public.kiosk_products
  SET stock_on_hand = v_new_on_hand
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  PERFORM public.record_kiosk_stock_movement(
    p_product_id,
    CASE
      WHEN p_movement_type = 'restock' THEN 'restock'
      WHEN p_movement_type = 'manual_increase' THEN 'manual_increase'
      WHEN p_movement_type = 'manual_decrease' THEN 'manual_decrease'
      WHEN p_movement_type = 'damage' THEN 'damage'
      WHEN p_movement_type = 'loss' THEN 'loss'
      WHEN p_movement_type = 'internal_consumption' THEN 'internal_consumption'
      ELSE 'correction'
    END,
    v_delta,
    v_prev_on_hand,
    v_product.stock_on_hand,
    v_prev_reserved,
    v_product.stock_reserved,
    NULL,
    NULL,
    NULL,
    v_reason
  );

  RETURN QUERY
  SELECT
    v_product.id,
    v_product.stock_on_hand,
    v_product.stock_reserved,
    v_product.stock_on_hand - v_product.stock_reserved;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_kiosk_stock_movement(
  uuid, text, integer, integer, integer, integer, integer, uuid, uuid, uuid, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.adjust_kiosk_product_stock(uuid, text, integer, text)
  TO authenticated;

COMMENT ON FUNCTION public.adjust_kiosk_product_stock IS
  'Ajuste manual atómico de stock global. Solo admin.';
