-- =============================================================================
-- Australe · Tienda: stock transaccional, pedidos y fidelización
-- Requiere: store_merchandising_foundation
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Registrar movimiento de stock
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.record_store_stock_movement(
  p_product_id uuid,
  p_variant_id uuid,
  p_movement_type text,
  p_quantity integer,
  p_previous_stock integer,
  p_new_stock integer,
  p_order_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.store_stock_movements (
    product_id, variant_id, order_id, event_id,
    movement_type, quantity, previous_stock, new_stock,
    reason, created_by
  )
  VALUES (
    p_product_id, p_variant_id, p_order_id, p_event_id,
    p_movement_type, p_quantity, p_previous_stock, p_new_stock,
    p_reason, COALESCE(p_created_by, auth.uid())
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_store_stock_movement(
  uuid, uuid, text, integer, integer, integer, uuid, uuid, text, uuid
) FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 2. Reservar stock (producto o variante)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_reserve_stock(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_order_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.store_products;
  v_variant public.store_product_variants;
  v_prev integer;
  v_new integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'store_reserve_stock: cantidad inválida';
  END IF;

  SELECT * INTO v_product
  FROM public.store_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_product.is_active OR v_product.status <> 'active' THEN
    RAISE EXCEPTION 'store_reserve_stock: producto no disponible';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant
    FROM public.store_product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND OR NOT v_variant.is_active THEN
      RAISE EXCEPTION 'store_reserve_stock: variante no disponible';
    END IF;

    IF v_product.track_stock
       AND (v_variant.stock_total - v_variant.stock_reserved) < p_quantity THEN
      RAISE EXCEPTION 'store_reserve_stock: stock insuficiente';
    END IF;

    v_prev := v_variant.stock_total - v_variant.stock_reserved;

    UPDATE public.store_product_variants
    SET stock_reserved = stock_reserved + p_quantity
    WHERE id = p_variant_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, p_variant_id, 'reserva', p_quantity,
      v_prev, v_new, p_order_id, p_event_id, p_reason
    );
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.store_product_variants v
      WHERE v.product_id = p_product_id AND v.is_active = true
    ) THEN
      RAISE EXCEPTION 'store_reserve_stock: variante requerida';
    END IF;

    IF v_product.track_stock
       AND (v_product.stock_total - v_product.stock_reserved) < p_quantity THEN
      RAISE EXCEPTION 'store_reserve_stock: stock insuficiente';
    END IF;

    v_prev := v_product.stock_total - v_product.stock_reserved;

    UPDATE public.store_products
    SET stock_reserved = stock_reserved + p_quantity
    WHERE id = p_product_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, NULL, 'reserva', p_quantity,
      v_prev, v_new, p_order_id, p_event_id, p_reason
    );
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Liberar reserva
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_release_reservation(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_order_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.store_products;
  v_variant public.store_product_variants;
  v_prev integer;
  v_new integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'store_release_reservation: cantidad inválida';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant
    FROM public.store_product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_release_reservation: variante no encontrada';
    END IF;

    IF v_variant.stock_reserved < p_quantity THEN
      RAISE EXCEPTION 'store_release_reservation: reserva insuficiente';
    END IF;

    v_prev := v_variant.stock_total - v_variant.stock_reserved;

    UPDATE public.store_product_variants
    SET stock_reserved = stock_reserved - p_quantity
    WHERE id = p_variant_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, p_variant_id, 'liberacion_reserva', -p_quantity,
      v_prev, v_new, p_order_id, p_event_id, p_reason
    );
  ELSE
    SELECT * INTO v_product
    FROM public.store_products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_release_reservation: producto no encontrado';
    END IF;

    IF v_product.stock_reserved < p_quantity THEN
      RAISE EXCEPTION 'store_release_reservation: reserva insuficiente';
    END IF;

    v_prev := v_product.stock_total - v_product.stock_reserved;

    UPDATE public.store_products
    SET stock_reserved = stock_reserved - p_quantity
    WHERE id = p_product_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, NULL, 'liberacion_reserva', -p_quantity,
      v_prev, v_new, p_order_id, p_event_id, p_reason
    );
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Confirmar venta desde reserva
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_confirm_sale(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_order_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.store_products;
  v_variant public.store_product_variants;
  v_prev integer;
  v_new integer;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'store_confirm_sale: cantidad inválida';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant
    FROM public.store_product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_confirm_sale: variante no encontrada';
    END IF;

    IF v_variant.stock_reserved < p_quantity THEN
      RAISE EXCEPTION 'store_confirm_sale: reserva insuficiente';
    END IF;

    v_prev := v_variant.stock_total - v_variant.stock_reserved;

    UPDATE public.store_product_variants
    SET
      stock_reserved = stock_reserved - p_quantity,
      stock_sold = stock_sold + p_quantity,
      stock_total = stock_total - p_quantity
    WHERE id = p_variant_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, p_variant_id, 'venta', -p_quantity,
      v_prev, v_new, p_order_id, p_event_id, p_reason
    );
  ELSE
    SELECT * INTO v_product
    FROM public.store_products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_confirm_sale: producto no encontrado';
    END IF;

    IF v_product.stock_reserved < p_quantity THEN
      RAISE EXCEPTION 'store_confirm_sale: reserva insuficiente';
    END IF;

    v_prev := v_product.stock_total - v_product.stock_reserved;

    UPDATE public.store_products
    SET
      stock_reserved = stock_reserved - p_quantity,
      stock_sold = stock_sold + p_quantity,
      stock_total = stock_total - p_quantity
    WHERE id = p_product_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, NULL, 'venta', -p_quantity,
      v_prev, v_new, p_order_id, p_event_id, p_reason
    );
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. Ajuste administrativo de stock
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_adjust_stock(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_quantity_delta integer DEFAULT 0,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.store_products;
  v_variant public.store_product_variants;
  v_prev integer;
  v_new integer;
  v_type text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'store_adjust_stock: permiso denegado';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'store_adjust_stock: motivo obligatorio';
  END IF;

  IF p_quantity_delta = 0 THEN
    RAISE EXCEPTION 'store_adjust_stock: cantidad inválida';
  END IF;

  v_type := CASE WHEN p_quantity_delta > 0 THEN 'ajuste_positivo' ELSE 'ajuste_negativo' END;

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant
    FROM public.store_product_variants
    WHERE id = p_variant_id AND product_id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_adjust_stock: variante no encontrada';
    END IF;

    v_prev := v_variant.stock_total - v_variant.stock_reserved;

    IF v_variant.stock_total + p_quantity_delta < v_variant.stock_reserved THEN
      RAISE EXCEPTION 'store_adjust_stock: stock resultante inválido';
    END IF;

    UPDATE public.store_product_variants
    SET stock_total = stock_total + p_quantity_delta
    WHERE id = p_variant_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, p_variant_id, v_type, p_quantity_delta,
      v_prev, v_new, NULL, NULL, p_reason, auth.uid()
    );
  ELSE
    SELECT * INTO v_product
    FROM public.store_products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'store_adjust_stock: producto no encontrado';
    END IF;

    v_prev := v_product.stock_total - v_product.stock_reserved;

    IF v_product.stock_total + p_quantity_delta < v_product.stock_reserved THEN
      RAISE EXCEPTION 'store_adjust_stock: stock resultante inválido';
    END IF;

    UPDATE public.store_products
    SET stock_total = stock_total + p_quantity_delta
    WHERE id = p_product_id
    RETURNING stock_total - stock_reserved INTO v_new;

    PERFORM public.record_store_stock_movement(
      p_product_id, NULL, v_type, p_quantity_delta,
      v_prev, v_new, NULL, NULL, p_reason, auth.uid()
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.store_adjust_stock(uuid, uuid, integer, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Resolver precio unitario
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.store_resolve_unit_price(
  p_product_id uuid,
  p_variant_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_community boolean DEFAULT false
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.store_products;
  v_variant public.store_product_variants;
  v_event_product public.event_store_products;
  v_price numeric(12, 2);
BEGIN
  SELECT * INTO v_product FROM public.store_products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store_resolve_unit_price: producto no encontrado';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant
    FROM public.store_product_variants
    WHERE id = p_variant_id AND product_id = p_product_id;
  END IF;

  IF p_event_id IS NOT NULL THEN
    SELECT * INTO v_event_product
    FROM public.event_store_products
    WHERE event_id = p_event_id AND product_id = p_product_id AND is_active = true;
  END IF;

  IF p_community THEN
    v_price := COALESCE(
      v_event_product.event_community_price_override,
      v_variant.community_price_override,
      v_product.community_price,
      v_event_product.event_price_override,
      v_variant.price_override,
      v_product.public_price
    );
  ELSE
    v_price := COALESCE(
      v_event_product.event_price_override,
      v_variant.price_override,
      v_product.public_price
    );
  END IF;

  RETURN COALESCE(v_price, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.store_resolve_unit_price(uuid, uuid, uuid, boolean) FROM PUBLIC;

-- -----------------------------------------------------------------------------
-- 7. Crear pedido público
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

  IF p_apply_community_price AND v_user_id IS NOT NULL THEN
    v_community_ok := EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.profile_id = v_user_id
        AND cm.status = 'active'
        AND cm.suspended_at IS NULL
    );
  END IF;

  -- Lock products in deterministic order
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

    IF p_event_id IS NOT NULL THEN
      SELECT * INTO v_event_product
      FROM public.event_store_products
      WHERE event_id = p_event_id AND product_id = v_product_id AND is_active = true;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'create_store_order: producto no asociado al evento';
      END IF;

      IF v_event_product.starts_at IS NOT NULL AND v_event_product.starts_at > now() THEN
        RAISE EXCEPTION 'create_store_order: producto aún no disponible';
      END IF;

      IF v_event_product.ends_at IS NOT NULL AND v_event_product.ends_at < now() THEN
        RAISE EXCEPTION 'create_store_order: producto expirado';
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

-- -----------------------------------------------------------------------------
-- 8. Marcar pedido pagado
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_store_order_paid(
  p_order_id uuid,
  p_payment_provider text DEFAULT 'manual',
  p_payment_reference text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_item public.store_order_items;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'mark_store_order_paid: permiso denegado';
  END IF;

  SELECT * INTO v_order
  FROM public.store_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_store_order_paid: pedido no encontrado';
  END IF;

  IF v_order.payment_status = 'confirmed' THEN
    RETURN;
  END IF;

  IF v_order.status IN ('cancelled', 'expired', 'refunded', 'delivered') THEN
    RAISE EXCEPTION 'mark_store_order_paid: estado inválido';
  END IF;

  IF v_order.pickup_event_id IS NOT NULL
     AND NOT (public.is_admin() OR public.staff_has_event_access(v_order.pickup_event_id)) THEN
    RAISE EXCEPTION 'mark_store_order_paid: sin acceso al evento';
  END IF;

  FOR v_item IN
    SELECT * FROM public.store_order_items WHERE order_id = p_order_id
  LOOP
    PERFORM public.store_confirm_sale(
      v_item.product_id, v_item.variant_id, v_item.quantity,
      p_order_id, v_order.event_id, 'mark_store_order_paid'
    );
  END LOOP;

  UPDATE public.store_orders
  SET
    status = 'paid',
    payment_status = 'confirmed',
    payment_provider = COALESCE(p_payment_provider, 'manual'),
    payment_reference = p_payment_reference,
    paid_at = now(),
    reserved_until = NULL,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_store_order_paid(uuid, text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. Preparar / listo / entregar
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_store_order_preparing(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'mark_store_order_preparing: permiso denegado';
  END IF;

  UPDATE public.store_orders
  SET status = 'preparing', prepared_at = now(), updated_at = now()
  WHERE id = p_order_id
    AND payment_status = 'confirmed'
    AND status IN ('paid', 'preparing');
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_store_order_ready(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'mark_store_order_ready: permiso denegado';
  END IF;

  UPDATE public.store_orders
  SET status = 'ready', ready_at = now(), updated_at = now()
  WHERE id = p_order_id
    AND payment_status = 'confirmed'
    AND status IN ('paid', 'preparing', 'ready');
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_store_order_delivered(
  p_order_id uuid,
  p_pickup_token text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'mark_store_order_delivered: permiso denegado';
  END IF;

  SELECT * INTO v_order
  FROM public.store_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_store_order_delivered: pedido no encontrado';
  END IF;

  IF v_order.status = 'delivered' THEN
    RETURN;
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'mark_store_order_delivered: pago no confirmado';
  END IF;

  IF v_order.pickup_event_id IS NOT NULL
     AND NOT (public.is_admin() OR public.staff_has_event_access(v_order.pickup_event_id)) THEN
    RAISE EXCEPTION 'mark_store_order_delivered: sin acceso al evento';
  END IF;

  IF p_pickup_token IS NOT NULL AND v_order.pickup_token_hash IS NOT NULL THEN
    v_hash := encode(digest(p_pickup_token, 'sha256'), 'hex');
    IF v_hash <> v_order.pickup_token_hash THEN
      RAISE EXCEPTION 'mark_store_order_delivered: token inválido';
    END IF;
  END IF;

  UPDATE public.store_orders
  SET
    status = 'delivered',
    delivered_at = now(),
    delivered_by = auth.uid(),
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_store_order_for_pickup(
  p_code text DEFAULT NULL,
  p_order_number text DEFAULT NULL
)
RETURNS SETOF public.store_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'lookup_store_order_for_pickup: permiso denegado';
  END IF;

  RETURN QUERY
  SELECT o.*
  FROM public.store_orders o
  WHERE (
    (p_code IS NOT NULL AND o.pickup_code = upper(btrim(p_code)))
    OR (p_order_number IS NOT NULL AND o.order_number = upper(btrim(p_order_number)))
  )
  AND (
    public.is_admin()
    OR (o.pickup_event_id IS NOT NULL AND public.staff_has_event_access(o.pickup_event_id))
  )
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_store_order_preparing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_store_order_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_store_order_delivered(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_store_order_for_pickup(text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 10. Cancelar / expirar pedidos
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_store_order(
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_item public.store_order_items;
BEGIN
  SELECT * INTO v_order
  FROM public.store_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cancel_store_order: pedido no encontrado';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RETURN;
  END IF;

  IF v_order.status = 'delivered' THEN
    RAISE EXCEPTION 'cancel_store_order: pedido ya entregado';
  END IF;

  IF v_order.user_id IS NOT NULL AND v_order.user_id <> auth.uid()
     AND NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'cancel_store_order: permiso denegado';
  END IF;

  IF v_order.payment_status = 'confirmed' THEN
    FOR v_item IN SELECT * FROM public.store_order_items WHERE order_id = p_order_id
    LOOP
      -- Devolver stock vendido: ingreso + liberación no aplica; usamos ajuste inverso vía confirm inverso
      -- Para pedidos pagados cancelados, reponer stock_total
      IF v_item.variant_id IS NOT NULL THEN
        UPDATE public.store_product_variants
        SET
          stock_total = stock_total + v_item.quantity,
          stock_sold = GREATEST(0, stock_sold - v_item.quantity)
        WHERE id = v_item.variant_id;
      ELSE
        UPDATE public.store_products
        SET
          stock_total = stock_total + v_item.quantity,
          stock_sold = GREATEST(0, stock_sold - v_item.quantity)
        WHERE id = v_item.product_id;
      END IF;

      PERFORM public.record_store_stock_movement(
        v_item.product_id, v_item.variant_id, 'cancelacion', v_item.quantity,
        0, 0, p_order_id, v_order.event_id, p_reason
      );
    END LOOP;

    PERFORM public.reverse_loyalty_points_for_store_order(p_order_id);
  ELSE
    FOR v_item IN SELECT * FROM public.store_order_items WHERE order_id = p_order_id
    LOOP
      PERFORM public.store_release_reservation(
        v_item.product_id, v_item.variant_id, v_item.quantity,
        p_order_id, v_order.event_id, COALESCE(p_reason, 'cancel_store_order')
      );
    END LOOP;
  END IF;

  UPDATE public.store_orders
  SET
    status = 'cancelled',
    payment_status = CASE
      WHEN payment_status = 'confirmed' THEN 'refunded'
      ELSE 'cancelled'
    END,
    cancelled_at = now(),
    reserved_until = NULL,
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_store_reservations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_count integer := 0;
BEGIN
  FOR v_order IN
    SELECT * FROM public.store_orders
    WHERE status IN ('pending', 'reserved')
      AND reserved_until IS NOT NULL
      AND reserved_until < now()
    FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public.cancel_store_order(v_order.id, 'reserva expirada');
    UPDATE public.store_orders
    SET status = 'expired'
    WHERE id = v_order.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_store_order(uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 11. Fidelización tienda
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_loyalty_points_for_store_order(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_settings public.community_settings;
  v_points integer;
  v_key text;
BEGIN
  SELECT * INTO v_order FROM public.store_orders WHERE id = p_order_id;

  IF NOT FOUND OR v_order.user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_order.payment_status <> 'confirmed' OR v_order.status = 'cancelled' THEN
    RETURN NULL;
  END IF;

  IF v_order.loyalty_points_awarded > 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_settings FROM public.community_settings WHERE id = 1;

  IF NOT COALESCE(v_settings.community_enabled, false)
     OR NOT COALESCE(v_settings.store_points_enabled, false) THEN
    RETURN NULL;
  END IF;

  v_points := floor(v_order.total / v_settings.amount_per_point)::integer;

  IF v_points <= 0 THEN
    RETURN NULL;
  END IF;

  v_key := 'store_order:' || p_order_id::text || ':earn';

  PERFORM public.award_loyalty_points(
    v_order.user_id,
    v_points,
    'earn',
    'store_order',
    p_order_id::text,
    v_key,
    'Puntos por compra en tienda ' || v_order.order_number,
    '{}'::jsonb,
    NULL
  );

  UPDATE public.store_orders
  SET loyalty_points_awarded = v_points
  WHERE id = p_order_id;

  RETURN p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_loyalty_points_for_store_order(p_order_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_key text;
BEGIN
  SELECT * INTO v_order FROM public.store_orders WHERE id = p_order_id;

  IF NOT FOUND OR v_order.user_id IS NULL OR v_order.loyalty_points_awarded <= 0 THEN
    RETURN NULL;
  END IF;

  v_key := 'store_order:' || p_order_id::text || ':reversal';

  PERFORM public.reverse_loyalty_points(
    v_order.user_id,
    v_order.loyalty_points_awarded,
    'reversal',
    'store_order',
    p_order_id::text,
    v_key,
    'Reversión puntos tienda ' || v_order.order_number,
    '{}'::jsonb,
    NULL
  );

  UPDATE public.store_orders
  SET loyalty_points_awarded = 0
  WHERE id = p_order_id;

  RETURN p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.award_loyalty_points_for_store_order(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reverse_loyalty_points_for_store_order(uuid) FROM PUBLIC, anon, authenticated;

-- Trigger post-pago: acreditar puntos vía service role desde app
-- La app llama award_loyalty_points_for_store_order tras mark_store_order_paid

-- Revocar RPCs internas de stock
REVOKE ALL ON FUNCTION public.store_reserve_stock(uuid, uuid, integer, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_release_reservation(uuid, uuid, integer, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_confirm_sale(uuid, uuid, integer, uuid, uuid, text) FROM PUBLIC;
