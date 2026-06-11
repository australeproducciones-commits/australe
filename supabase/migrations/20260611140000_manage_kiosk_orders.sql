-- =============================================================================
-- Australe Producciones · ETAPA C.2.3 — Gestión de órdenes de kiosco
-- Requiere: event_kiosk_foundation, manual_kiosk_order
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Marcar orden como pagada
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
-- B) Marcar orden lista para retirar
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_kiosk_order_ready(p_order_id uuid)
RETURNS TABLE (
  order_id uuid,
  order_code text,
  pickup_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.kiosk_orders;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'mark_kiosk_order_ready: usuario no autenticado';
  END IF;

  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'mark_kiosk_order_ready: permiso denegado';
  END IF;

  SELECT *
  INTO v_order
  FROM public.kiosk_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_kiosk_order_ready: orden no encontrada';
  END IF;

  IF v_order.pickup_status IN ('cancelled', 'delivered') THEN
    RAISE EXCEPTION 'mark_kiosk_order_ready: la orden no puede marcarse como lista';
  END IF;

  IF v_order.payment_status IN ('cancelled', 'refunded') THEN
    RAISE EXCEPTION 'mark_kiosk_order_ready: la orden está cancelada';
  END IF;

  IF v_order.pickup_status = 'ready' THEN
    RETURN QUERY
    SELECT v_order.id, v_order.order_code, v_order.pickup_status;
    RETURN;
  END IF;

  UPDATE public.kiosk_orders
  SET
    pickup_status = 'ready',
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN QUERY
  SELECT v_order.id, v_order.order_code, v_order.pickup_status;
END;
$$;

-- -----------------------------------------------------------------------------
-- C) Marcar orden entregada
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_kiosk_order_delivered(p_order_id uuid)
RETURNS TABLE (
  order_id uuid,
  order_code text,
  pickup_status text,
  delivered_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.kiosk_orders;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'mark_kiosk_order_delivered: usuario no autenticado';
  END IF;

  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'mark_kiosk_order_delivered: permiso denegado';
  END IF;

  SELECT *
  INTO v_order
  FROM public.kiosk_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_kiosk_order_delivered: orden no encontrada';
  END IF;

  IF v_order.pickup_status = 'cancelled' THEN
    RAISE EXCEPTION 'mark_kiosk_order_delivered: la orden está cancelada';
  END IF;

  IF v_order.payment_status <> 'paid' THEN
    RAISE EXCEPTION 'mark_kiosk_order_delivered: la orden debe estar pagada antes de entregar';
  END IF;

  IF v_order.pickup_status = 'delivered' THEN
    RETURN QUERY
    SELECT v_order.id, v_order.order_code, v_order.pickup_status, v_order.delivered_at;
    RETURN;
  END IF;

  UPDATE public.kiosk_orders
  SET
    pickup_status = 'delivered',
    delivered_at = COALESCE(delivered_at, now()),
    updated_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN QUERY
  SELECT v_order.id, v_order.order_code, v_order.pickup_status, v_order.delivered_at;
END;
$$;

-- -----------------------------------------------------------------------------
-- D) Cancelar orden y liberar stock
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

  -- Idempotente: ya cancelada
  IF v_order.payment_status = 'cancelled'
    AND v_order.pickup_status = 'cancelled' THEN
    RETURN QUERY
    SELECT v_order.id, v_order.order_code, v_order.payment_status, v_order.pickup_status;
    RETURN;
  END IF;

  IF v_order.pickup_status = 'delivered' THEN
    RAISE EXCEPTION 'cancel_kiosk_order: no se puede cancelar una orden ya entregada';
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
    WHERE id = v_item.event_kiosk_product_id
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.event_kiosk_products
      SET stock_sold = GREATEST(0, stock_sold - v_item.quantity)
      WHERE id = v_item.event_kiosk_product_id;
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

COMMENT ON FUNCTION public.mark_kiosk_order_paid(uuid) IS
  'Marca orden de kiosco como pagada. Admin o cajero.';

COMMENT ON FUNCTION public.mark_kiosk_order_ready(uuid) IS
  'Marca orden lista para retirar. Admin o cajero.';

COMMENT ON FUNCTION public.mark_kiosk_order_delivered(uuid) IS
  'Marca orden entregada; exige pago confirmado. Admin o cajero.';

COMMENT ON FUNCTION public.cancel_kiosk_order(uuid, text) IS
  'Cancela orden y libera stock_sold de sus ítems (idempotente). Admin o cajero.';

REVOKE ALL ON FUNCTION public.mark_kiosk_order_paid(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_kiosk_order_ready(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_kiosk_order_delivered(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_kiosk_order(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mark_kiosk_order_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_kiosk_order_ready(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_kiosk_order_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_kiosk_order(uuid, text) TO authenticated;
