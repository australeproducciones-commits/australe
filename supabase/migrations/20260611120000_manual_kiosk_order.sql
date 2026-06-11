-- =============================================================================
-- Australe Producciones · ETAPA C.2.2 — Venta manual de consumisiones
-- Requiere: schema-v1.sql, profile-functions, policies, event_kiosk_foundation
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_manual_kiosk_order(
  p_event_id uuid,
  p_buyer_name text,
  p_buyer_whatsapp text DEFAULT NULL,
  p_buyer_dni text DEFAULT NULL,
  p_buyer_email text DEFAULT NULL,
  p_ticket_id uuid DEFAULT NULL,
  p_payment_status text DEFAULT 'pending',
  p_notes text DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  order_id uuid,
  order_code text,
  total_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_buyer_name text;
  v_event public.events;
  v_settings public.event_kiosk_settings;
  v_order_id uuid;
  v_order_code text;
  v_total numeric(12, 2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity integer;
  v_row public.event_kiosk_products;
  v_catalog public.kiosk_products;
  v_subtotal numeric(12, 2);
  v_product_name text;
  v_ids uuid[];
  v_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: usuario no autenticado';
  END IF;

  IF NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: permiso denegado';
  END IF;

  v_buyer_name := btrim(p_buyer_name);

  IF v_buyer_name IS NULL OR v_buyer_name = '' THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: comprador requerido';
  END IF;

  IF p_payment_status NOT IN ('pending', 'paid') THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: estado de pago inválido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: items requeridos';
  END IF;

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: evento no encontrado';
  END IF;

  SELECT *
  INTO v_settings
  FROM public.event_kiosk_settings
  WHERE event_id = p_event_id;

  IF FOUND AND v_settings.manual_sales_enabled = false THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: venta manual deshabilitada para este evento';
  END IF;

  IF p_ticket_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.tickets t
      WHERE t.id = p_ticket_id
        AND t.event_id = p_event_id
    ) THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: entrada no pertenece al evento';
    END IF;
  END IF;

  v_ids := ARRAY[]::uuid[];

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    IF NOT (v_item ? 'event_kiosk_product_id' AND v_item ? 'quantity') THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: item inválido';
    END IF;

    BEGIN
      v_product_id := (v_item ->> 'event_kiosk_product_id')::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'create_manual_kiosk_order: producto inválido';
    END;

    v_quantity := (v_item ->> 'quantity')::integer;

    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: cantidad inválida';
    END IF;

    IF NOT v_product_id = ANY (v_ids) THEN
      v_ids := array_append(v_ids, v_product_id);
    END IF;
  END LOOP;

  IF (
    SELECT count(*)::integer
    FROM public.event_kiosk_products
    WHERE id = ANY (v_ids)
      AND event_id = p_event_id
  ) <> coalesce(array_length(v_ids, 1), 0) THEN
    RAISE EXCEPTION 'create_manual_kiosk_order: producto no pertenece al evento';
  END IF;

  FOR v_id IN
    SELECT ekp.id
    FROM public.event_kiosk_products ekp
    WHERE ekp.id = ANY (v_ids)
      AND ekp.event_id = p_event_id
    ORDER BY ekp.id
  LOOP
    SELECT *
    INTO v_row
    FROM public.event_kiosk_products
    WHERE id = v_id
    FOR UPDATE;
  END LOOP;

  v_total := 0;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'event_kiosk_product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    SELECT *
    INTO v_row
    FROM public.event_kiosk_products
    WHERE id = v_product_id;

    IF NOT v_row.is_available THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: producto no disponible';
    END IF;

    SELECT *
    INTO v_catalog
    FROM public.kiosk_products
    WHERE id = v_row.product_id;

    IF NOT FOUND OR v_catalog.is_active = false THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: producto del catálogo inactivo';
    END IF;

    IF v_row.stock_total IS NOT NULL
      AND (v_row.stock_sold + v_quantity) > v_row.stock_total THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: stock insuficiente';
    END IF;

    v_total := v_total + (v_row.price * v_quantity);
  END LOOP;

  INSERT INTO public.kiosk_orders (
    event_id,
    buyer_name,
    buyer_whatsapp,
    buyer_dni,
    buyer_email,
    ticket_id,
    order_code,
    source,
    payment_status,
    pickup_status,
    total_amount,
    paid_at,
    notes,
    created_by
  )
  VALUES (
    p_event_id,
    v_buyer_name,
    NULLIF(btrim(p_buyer_whatsapp), ''),
    NULLIF(btrim(p_buyer_dni), ''),
    NULLIF(btrim(p_buyer_email), ''),
    p_ticket_id,
    '',
    'manual',
    p_payment_status,
    'pending',
    0,
    CASE WHEN p_payment_status = 'paid' THEN now() ELSE NULL END,
    NULLIF(btrim(p_notes), ''),
    v_user_id
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item ->> 'event_kiosk_product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    SELECT *
    INTO v_row
    FROM public.event_kiosk_products
    WHERE id = v_product_id
    FOR UPDATE;

    SELECT name
    INTO v_product_name
    FROM public.kiosk_products
    WHERE id = v_row.product_id;

    v_subtotal := v_row.price * v_quantity;

    INSERT INTO public.kiosk_order_items (
      order_id,
      event_kiosk_product_id,
      product_name,
      unit_price,
      quantity,
      subtotal
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_product_name,
      v_row.price,
      v_quantity,
      v_subtotal
    );

    UPDATE public.event_kiosk_products
    SET stock_sold = stock_sold + v_quantity
    WHERE id = v_product_id;
  END LOOP;

  SELECT ko.order_code, ko.total_amount
  INTO v_order_code, v_total
  FROM public.kiosk_orders ko
  WHERE ko.id = v_order_id;

  RETURN QUERY
  SELECT v_order_id, v_order_code, v_total;
END;
$$;

COMMENT ON FUNCTION public.create_manual_kiosk_order IS
  'Venta manual atómica: valida stock, crea orden (source=manual), ítems congelados e incrementa stock_sold. Admin o cajero.';

REVOKE ALL ON FUNCTION public.create_manual_kiosk_order(
  uuid, text, text, text, text, uuid, text, text, jsonb
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_manual_kiosk_order(
  uuid, text, text, text, text, uuid, text, text, jsonb
) TO authenticated;
