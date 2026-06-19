-- =============================================================================
-- Australe · RPCs de kiosco con inventario central
-- Requiere: global_product_inventory migration
-- =============================================================================

-- Helper interno: reservar stock global
CREATE OR REPLACE FUNCTION public.kiosk_global_reserve_stock(
  p_product_id uuid,
  p_quantity integer,
  p_event_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_order_item_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.kiosk_products;
  v_prev_on_hand integer;
  v_prev_reserved integer;
BEGIN
  SELECT *
  INTO v_product
  FROM public.kiosk_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND OR v_product.is_active = false THEN
    RAISE EXCEPTION 'kiosk_global_reserve_stock: producto no disponible';
  END IF;

  IF (v_product.stock_on_hand - v_product.stock_reserved) < p_quantity THEN
    RAISE EXCEPTION 'kiosk_global_reserve_stock: stock insuficiente';
  END IF;

  v_prev_on_hand := v_product.stock_on_hand;
  v_prev_reserved := v_product.stock_reserved;

  UPDATE public.kiosk_products
  SET stock_reserved = stock_reserved + p_quantity
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  PERFORM public.record_kiosk_stock_movement(
    p_product_id,
    'reservation',
    p_quantity,
    v_prev_on_hand,
    v_product.stock_on_hand,
    v_prev_reserved,
    v_product.stock_reserved,
    p_event_id,
    p_order_id,
    p_order_item_id,
    p_reason
  );
END;
$$;

-- Helper: confirmar venta desde reserva
CREATE OR REPLACE FUNCTION public.kiosk_global_confirm_sale(
  p_product_id uuid,
  p_quantity integer,
  p_event_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_order_item_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.kiosk_products;
  v_prev_on_hand integer;
  v_prev_reserved integer;
BEGIN
  SELECT *
  INTO v_product
  FROM public.kiosk_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kiosk_global_confirm_sale: producto no encontrado';
  END IF;

  IF v_product.stock_reserved < p_quantity THEN
    RAISE EXCEPTION 'kiosk_global_confirm_sale: reserva insuficiente';
  END IF;

  v_prev_on_hand := v_product.stock_on_hand;
  v_prev_reserved := v_product.stock_reserved;

  UPDATE public.kiosk_products
  SET
    stock_reserved = stock_reserved - p_quantity,
    stock_on_hand = stock_on_hand - p_quantity
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  PERFORM public.record_kiosk_stock_movement(
    p_product_id,
    'sale_confirmation',
    -p_quantity,
    v_prev_on_hand,
    v_product.stock_on_hand,
    v_prev_reserved,
    v_product.stock_reserved,
    p_event_id,
    p_order_id,
    p_order_item_id,
    p_reason
  );
END;
$$;

-- Helper: venta directa (sin reserva previa)
CREATE OR REPLACE FUNCTION public.kiosk_global_direct_sale(
  p_product_id uuid,
  p_quantity integer,
  p_event_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_order_item_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.kiosk_products;
  v_prev_on_hand integer;
  v_prev_reserved integer;
BEGIN
  SELECT *
  INTO v_product
  FROM public.kiosk_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND OR v_product.is_active = false THEN
    RAISE EXCEPTION 'kiosk_global_direct_sale: producto no disponible';
  END IF;

  IF (v_product.stock_on_hand - v_product.stock_reserved) < p_quantity THEN
    RAISE EXCEPTION 'kiosk_global_direct_sale: stock insuficiente';
  END IF;

  v_prev_on_hand := v_product.stock_on_hand;
  v_prev_reserved := v_product.stock_reserved;

  UPDATE public.kiosk_products
  SET stock_on_hand = stock_on_hand - p_quantity
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  PERFORM public.record_kiosk_stock_movement(
    p_product_id,
    'sale',
    -p_quantity,
    v_prev_on_hand,
    v_product.stock_on_hand,
    v_prev_reserved,
    v_product.stock_reserved,
    p_event_id,
    p_order_id,
    p_order_item_id,
    p_reason
  );
END;
$$;

-- Helper: liberar reserva
CREATE OR REPLACE FUNCTION public.kiosk_global_release_reservation(
  p_product_id uuid,
  p_quantity integer,
  p_event_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_order_item_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.kiosk_products;
  v_prev_on_hand integer;
  v_prev_reserved integer;
  v_release integer;
BEGIN
  SELECT *
  INTO v_product
  FROM public.kiosk_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_release := LEAST(p_quantity, v_product.stock_reserved);
  IF v_release <= 0 THEN
    RETURN;
  END IF;

  v_prev_on_hand := v_product.stock_on_hand;
  v_prev_reserved := v_product.stock_reserved;

  UPDATE public.kiosk_products
  SET stock_reserved = stock_reserved - v_release
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  PERFORM public.record_kiosk_stock_movement(
    p_product_id,
    'reservation_release',
    -v_release,
    v_prev_on_hand,
    v_product.stock_on_hand,
    v_prev_reserved,
    v_product.stock_reserved,
    p_event_id,
    p_order_id,
    p_order_item_id,
    p_reason
  );
END;
$$;

-- Helper: devolver stock físico (cancelación con reintegro)
CREATE OR REPLACE FUNCTION public.kiosk_global_return_stock(
  p_product_id uuid,
  p_quantity integer,
  p_event_id uuid DEFAULT NULL,
  p_order_id uuid DEFAULT NULL,
  p_order_item_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.kiosk_products;
  v_prev_on_hand integer;
  v_prev_reserved integer;
BEGIN
  SELECT *
  INTO v_product
  FROM public.kiosk_products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_prev_on_hand := v_product.stock_on_hand;
  v_prev_reserved := v_product.stock_reserved;

  UPDATE public.kiosk_products
  SET stock_on_hand = stock_on_hand + p_quantity
  WHERE id = p_product_id
  RETURNING * INTO v_product;

  PERFORM public.record_kiosk_stock_movement(
    p_product_id,
    'sale_cancellation',
    p_quantity,
    v_prev_on_hand,
    v_product.stock_on_hand,
    v_prev_reserved,
    v_product.stock_reserved,
    p_event_id,
    p_order_id,
    p_order_item_id,
    p_reason
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Actualizar mark_kiosk_order_paid: confirmar reservas
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_kiosk_order_paid(p_order_id uuid)
RETURNS TABLE (
  order_id uuid,
  order_code text,
  payment_status text,
  paid_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.kiosk_orders;
  v_item public.kiosk_order_items;
  v_row public.event_kiosk_products;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'mark_kiosk_order_paid: usuario no autenticado';
  END IF;

  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'mark_kiosk_order_paid: permiso denegado';
  END IF;

  SELECT *
  INTO v_order
  FROM public.kiosk_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_kiosk_order_paid: orden no encontrada';
  END IF;

  IF v_order.payment_status IN ('cancelled', 'refunded') THEN
    RAISE EXCEPTION 'mark_kiosk_order_paid: la orden está cancelada o reintegrada';
  END IF;

  IF v_order.payment_status = 'paid' THEN
    RETURN QUERY
    SELECT v_order.id, v_order.order_code, v_order.payment_status, v_order.paid_at;
    RETURN;
  END IF;

  FOR v_item IN
    SELECT *
    FROM public.kiosk_order_items
    WHERE order_id = p_order_id
    ORDER BY id
  LOOP
    SELECT *
    INTO v_row
    FROM public.event_kiosk_products
    WHERE id = v_item.event_kiosk_product_id;

    IF FOUND THEN
      PERFORM public.kiosk_global_confirm_sale(
        v_row.product_id,
        v_item.quantity,
        v_order.event_id,
        p_order_id,
        v_item.id,
        'Confirmación de pago'
      );
    END IF;
  END LOOP;

  UPDATE public.kiosk_orders
  SET
    payment_status = 'paid',
    paid_at = COALESCE(paid_at, now()),
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN QUERY
  SELECT v_order.id, v_order.order_code, v_order.payment_status, v_order.paid_at;
END;
$$;

-- -----------------------------------------------------------------------------
-- Actualizar cancel_kiosk_order
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_kiosk_order(
  p_order_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_code text,
  payment_status text,
  pickup_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.kiosk_orders;
  v_item public.kiosk_order_items;
  v_row public.event_kiosk_products;
  v_reason text;
  v_notes text;
  v_was_paid boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'cancel_kiosk_order: usuario no autenticado';
  END IF;

  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'cancel_kiosk_order: permiso denegado';
  END IF;

  SELECT *
  INTO v_order
  FROM public.kiosk_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cancel_kiosk_order: orden no encontrada';
  END IF;

  IF v_order.payment_status = 'cancelled'
    AND v_order.pickup_status = 'cancelled' THEN
    RETURN QUERY
    SELECT v_order.id, v_order.order_code, v_order.payment_status, v_order.pickup_status;
    RETURN;
  END IF;

  IF v_order.pickup_status = 'delivered' THEN
    RAISE EXCEPTION 'cancel_kiosk_order: no se puede cancelar una orden ya entregada';
  END IF;

  v_was_paid := v_order.payment_status = 'paid';

  FOR v_item IN
    SELECT *
    FROM public.kiosk_order_items
    WHERE order_id = p_order_id
    ORDER BY id
  LOOP
    SELECT *
    INTO v_row
    FROM public.event_kiosk_products
    WHERE id = v_item.event_kiosk_product_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_was_paid THEN
      PERFORM public.kiosk_global_return_stock(
        v_row.product_id,
        v_item.quantity,
        v_order.event_id,
        p_order_id,
        v_item.id,
        COALESCE(NULLIF(btrim(p_reason), ''), 'Cancelación con devolución')
      );
    ELSE
      PERFORM public.kiosk_global_release_reservation(
        v_row.product_id,
        v_item.quantity,
        v_order.event_id,
        p_order_id,
        v_item.id,
        COALESCE(NULLIF(btrim(p_reason), ''), 'Cancelación de reserva')
      );
    END IF;
  END LOOP;

  v_reason := NULLIF(btrim(p_reason), '');

  IF v_reason IS NOT NULL THEN
    IF v_order.notes IS NOT NULL AND btrim(v_order.notes) <> '' THEN
      v_notes := v_order.notes || E'\nCancelación: ' || v_reason;
    ELSE
      v_notes := 'Cancelación: ' || v_reason;
    END IF;
  ELSE
    v_notes := v_order.notes;
  END IF;

  UPDATE public.kiosk_orders
  SET
    payment_status = 'cancelled',
    pickup_status = 'cancelled',
    notes = v_notes,
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN QUERY
  SELECT v_order.id, v_order.order_code, v_order.payment_status, v_order.pickup_status;
END;
$$;
