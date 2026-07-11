-- =============================================================================
-- Australe · Tienda: canales de venta (show_in_store) y elegibilidad comercial
-- Aditivo. No modifica migraciones previas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Columna show_in_store
-- -----------------------------------------------------------------------------

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS show_in_store boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.store_products.show_in_store IS
  'Si true, el producto puede aparecer en el catálogo general /tienda (requiere is_active y status=active).';

-- Backfill: productos activos conservan visibilidad en tienda (DEFAULT true ya aplica).
UPDATE public.store_products
SET show_in_store = true
WHERE is_active = true
  AND status = 'active'
  AND show_in_store IS DISTINCT FROM true;

CREATE INDEX IF NOT EXISTS store_products_general_catalog_idx
  ON public.store_products (status, is_active, show_in_store)
  WHERE is_active = true AND status = 'active' AND show_in_store = true;

-- -----------------------------------------------------------------------------
-- 2. Helpers de comunidad y vigencia
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_viewer_is_community_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.community_members cm
      WHERE cm.profile_id = auth.uid()
        AND cm.status = 'active'
        AND cm.suspended_at IS NULL
    );
$$;

REVOKE ALL ON FUNCTION public.store_viewer_is_community_member() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.store_viewer_is_community_member() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.event_store_association_is_active(
  p_assoc public.event_store_products,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    p_assoc.is_active
    AND (p_assoc.starts_at IS NULL OR p_assoc.starts_at <= p_now)
    AND (p_assoc.ends_at IS NULL OR p_assoc.ends_at >= p_now);
$$;

-- -----------------------------------------------------------------------------
-- 3. Fin de evento para comercio (Mendoza, alineado con eventTiming.ts)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.event_commerce_end_at(p_event public.events)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_end_date date;
  v_start_at timestamptz;
  v_end_at timestamptz;
BEGIN
  IF p_event.event_date IS NULL THEN
    RETURN NULL;
  END IF;

  v_end_date := COALESCE(p_event.event_end_date, p_event.event_date);

  IF p_event.end_time IS NOT NULL THEN
    v_start_at := (p_event.event_date::timestamp + COALESCE(p_event.start_time, time '00:00:00'))
      AT TIME ZONE 'America/Argentina/Mendoza';
    v_end_at := (v_end_date::timestamp + p_event.end_time)
      AT TIME ZONE 'America/Argentina/Mendoza';

    IF v_end_at <= v_start_at THEN
      v_end_at := v_end_at + interval '1 day';
    END IF;

    RETURN v_end_at;
  END IF;

  IF p_event.event_end_date IS NOT NULL AND p_event.event_end_date <> p_event.event_date THEN
    RETURN (v_end_date::timestamp + time '23:59:59')
      AT TIME ZONE 'America/Argentina/Mendoza';
  END IF;

  IF p_event.start_time IS NOT NULL THEN
    v_start_at := (p_event.event_date::timestamp + p_event.start_time)
      AT TIME ZONE 'America/Argentina/Mendoza';
    RETURN v_start_at + interval '4 hours';
  END IF;

  RETURN (v_end_date::timestamp + time '23:59:59')
    AT TIME ZONE 'America/Argentina/Mendoza';
END;
$$;

CREATE OR REPLACE FUNCTION public.event_is_commerce_eligible(
  p_event_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event public.events;
  v_end_at timestamptz;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;

  IF NOT FOUND OR v_event.status <> 'published' THEN
    RETURN false;
  END IF;

  v_end_at := public.event_commerce_end_at(v_event);

  IF v_end_at IS NOT NULL AND p_now >= v_end_at THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.event_is_commerce_eligible(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.event_is_commerce_eligible(uuid, timestamptz) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.store_product_visible_in_general_catalog(
  p_product public.store_products,
  p_now timestamptz DEFAULT now()
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    public.store_product_is_publicly_available(p_product, p_now)
    AND p_product.show_in_store = true
    AND (
      NOT p_product.community_only
      OR public.store_viewer_is_community_member()
    );
$$;

-- -----------------------------------------------------------------------------
-- 4. RLS store_products — comunidad real (no solo autenticado)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS store_products_public_select ON public.store_products;
CREATE POLICY store_products_public_select ON public.store_products
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND status = 'active'
    AND (
      NOT community_only
      OR public.store_viewer_is_community_member()
    )
    AND (
      show_in_store = true
      OR EXISTS (
        SELECT 1
        FROM public.event_store_products esp
        WHERE esp.product_id = store_products.id
          AND public.event_store_association_is_active(esp)
          AND EXISTS (
            SELECT 1
            FROM public.event_store_settings ess
            WHERE ess.event_id = esp.event_id
              AND ess.merchandising_enabled = true
              AND public.event_is_commerce_eligible(esp.event_id)
          )
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 5. RLS event_store_products — asociación vigente + evento comerciable
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS event_store_products_public_select ON public.event_store_products;
CREATE POLICY event_store_products_public_select ON public.event_store_products
  FOR SELECT TO anon, authenticated
  USING (
    public.event_store_association_is_active(event_store_products)
    AND EXISTS (
      SELECT 1
      FROM public.event_store_settings ess
      WHERE ess.event_id = event_store_products.event_id
        AND ess.merchandising_enabled = true
        AND public.event_is_commerce_eligible(ess.event_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Badge merch — reutilizar elegibilidad comercial centralizada
-- -----------------------------------------------------------------------------

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
    JOIN public.event_store_products esp ON esp.event_id = ess.event_id
    JOIN public.store_products sp ON sp.id = esp.product_id
    WHERE ess.event_id = p_event_id
      AND ess.merchandising_enabled = true
      AND ess.show_badge = true
      AND public.event_is_commerce_eligible(p_event_id)
      AND public.event_store_association_is_active(esp)
      AND public.store_product_is_publicly_available(sp)
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
-- 7. create_store_order — validación por canal
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_store_order(
  p_customer_name text,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_pickup_event_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_apply_community_price boolean DEFAULT false
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  total_amount numeric,
  pickup_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
  v_email text;
  v_phone text;
  v_order_id uuid;
  v_order_number text;
  v_pickup_code text;
  v_token_raw text;
  v_token_hash text;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_variant_id uuid;
  v_quantity integer;
  v_product public.store_products;
  v_variant public.store_product_variants;
  v_event_product public.event_store_products;
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_item_name text;
  v_variant_name text;
  v_sku text;
  v_order_item_id uuid;
  v_reserved_until timestamptz;
  v_community_ok boolean := false;
  v_ids uuid[];
BEGIN
  v_user_id := auth.uid();
  v_name := btrim(p_customer_name);
  v_email := NULLIF(btrim(p_customer_email), '');
  v_phone := NULLIF(btrim(p_customer_phone), '');

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'create_store_order: nombre requerido';
  END IF;

  IF v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'create_store_order: contacto requerido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'create_store_order: items requeridos';
  END IF;

  IF v_user_id IS NOT NULL THEN
    v_community_ok := EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.profile_id = v_user_id
        AND cm.status = 'active'
        AND cm.suspended_at IS NULL
    );
  END IF;

  IF p_event_id IS NOT NULL THEN
    IF NOT public.event_is_commerce_eligible(p_event_id) THEN
      RAISE EXCEPTION 'create_store_order: evento no disponible para comercio';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.event_store_settings ess
      WHERE ess.event_id = p_event_id
        AND ess.merchandising_enabled = true
    ) THEN
      RAISE EXCEPTION 'create_store_order: merchandising no habilitado';
    END IF;
  END IF;

  v_ids := ARRAY[]::uuid[];
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    IF NOT v_product_id = ANY (v_ids) THEN
      v_ids := array_append(v_ids, v_product_id);
    END IF;
  END LOOP;

  FOR v_product_id IN SELECT unnest(v_ids) ORDER BY 1
  LOOP
    PERFORM 1 FROM public.store_products WHERE id = v_product_id FOR UPDATE;
  END LOOP;

  v_total := 0;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_variant_id := NULLIF(v_item ->> 'variant_id', '')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'create_store_order: cantidad inválida';
    END IF;

    SELECT * INTO v_product FROM public.store_products WHERE id = v_product_id;

    IF NOT public.store_product_is_publicly_available(v_product) THEN
      RAISE EXCEPTION 'create_store_order: producto no disponible';
    END IF;

    IF v_product.community_only AND NOT v_community_ok THEN
      RAISE EXCEPTION 'create_store_order: producto exclusivo comunidad';
    END IF;

    IF v_product.max_per_order IS NOT NULL AND v_quantity > v_product.max_per_order THEN
      RAISE EXCEPTION 'create_store_order: max_per_order_exceeded';
    END IF;

    IF p_event_id IS NULL THEN
      IF NOT v_product.show_in_store THEN
        RAISE EXCEPTION 'create_store_order: producto no disponible en tienda general';
      END IF;
    ELSE
      SELECT * INTO v_event_product
      FROM public.event_store_products
      WHERE event_id = p_event_id AND product_id = v_product_id;

      IF NOT FOUND OR NOT public.event_store_association_is_active(v_event_product) THEN
        RAISE EXCEPTION 'create_store_order: producto no asociado al evento';
      END IF;
    END IF;

    v_unit_price := public.store_resolve_unit_price(
      v_product_id, v_variant_id, p_event_id, v_community_ok AND p_apply_community_price
    );

    v_total := v_total + (v_unit_price * v_quantity);
  END LOOP;

  v_order_number := public.generate_store_order_number();
  v_pickup_code := public.generate_store_pickup_code();
  v_token_raw := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token_raw, 'sha256'), 'hex');
  v_reserved_until := now() + interval '30 minutes';

  INSERT INTO public.store_orders (
    order_number, user_id, event_id,
    customer_name, customer_email, customer_phone,
    status, payment_status,
    subtotal, total,
    pickup_method, pickup_event_id,
    pickup_code, pickup_token_hash,
    reserved_until
  )
  VALUES (
    v_order_number, v_user_id, p_event_id,
    v_name, v_email, v_phone,
    'reserved', 'pending',
    v_total, v_total,
    'event', p_pickup_event_id,
    v_pickup_code, v_token_hash,
    v_reserved_until
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_variant_id := NULLIF(v_item ->> 'variant_id', '')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    SELECT * INTO v_product FROM public.store_products WHERE id = v_product_id;
    v_variant_name := NULL;
    v_sku := v_product.sku;

    IF v_variant_id IS NOT NULL THEN
      SELECT * INTO v_variant
      FROM public.store_product_variants
      WHERE id = v_variant_id AND product_id = v_product_id;

      v_variant_name := v_variant.name;
      v_sku := COALESCE(v_variant.sku, v_product.sku);
    END IF;

    v_unit_price := public.store_resolve_unit_price(
      v_product_id, v_variant_id, p_event_id, v_community_ok AND p_apply_community_price
    );
    v_subtotal := v_unit_price * v_quantity;
    v_item_name := v_product.name;

    INSERT INTO public.store_order_items (
      order_id, product_id, variant_id,
      product_name_snapshot, variant_name_snapshot, sku_snapshot,
      unit_price, quantity, subtotal, community_price_applied
    )
    VALUES (
      v_order_id, v_product_id, v_variant_id,
      v_item_name, v_variant_name, v_sku,
      v_unit_price, v_quantity, v_subtotal, v_community_ok AND p_apply_community_price
    )
    RETURNING id INTO v_order_item_id;

    PERFORM public.store_reserve_stock(
      v_product_id, v_variant_id, v_quantity,
      v_order_id, p_event_id, 'create_store_order'
    );
  END LOOP;

  order_id := v_order_id;
  order_number := v_order_number;
  total_amount := v_total;
  pickup_code := v_pickup_code;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_order(text, text, text, uuid, uuid, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_order(text, text, text, uuid, uuid, jsonb, boolean) TO authenticated, anon;

ALTER FUNCTION public.create_store_order(
  text, text, text, uuid, uuid, jsonb, boolean
) SET search_path = public, extensions;

NOTIFY pgrst, 'reload schema';
