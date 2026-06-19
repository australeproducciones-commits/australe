-- =============================================================================
-- Australe · Etapa 1: endurecimiento de seguridad — usuarios internos
-- - Bloquea self-update de staff_all_events
-- - DEFAULT false en staff_all_events (nuevos perfiles sin acceso global accidental)
-- - Coherencia event_staff.role = profiles.role en staff_has_event_access
-- - RLS kiosco limitado por evento (cajero)
-- - RPC mark_ticket_used para admin/portero
-- - Validación de acceso por evento en RPCs y trigger de kiosk_orders
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Columnas sensibles en profiles
-- -----------------------------------------------------------------------------

REVOKE UPDATE (role, is_active, staff_all_events, id, created_at)
  ON public.profiles
  FROM authenticated;

-- Solo afecta INSERTs futuros que omitan la columna; no modifica filas existentes.
ALTER TABLE public.profiles
  ALTER COLUMN staff_all_events SET DEFAULT false;

COMMENT ON COLUMN public.profiles.staff_all_events IS
  'Solo modificable por admin (vía servidor). DEFAULT false: cajero/portero requieren asignación o opt-in explícito.';

-- -----------------------------------------------------------------------------
-- 2) staff_has_event_access — coherencia de rol en event_staff
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.staff_has_event_access(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin()
    OR (
      public.current_user_role() IN ('cashier', 'door')
      AND COALESCE(
        (
          SELECT p.staff_all_events
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.is_active = true
        ),
        false
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_staff es
      INNER JOIN public.profiles p ON p.id = auth.uid()
      WHERE es.event_id = p_event_id
        AND es.user_id = auth.uid()
        AND es.is_active = true
        AND p.is_active = true
        AND es.role = p.role
        AND p.role IN ('cashier', 'door')
    );
$$;

COMMENT ON FUNCTION public.staff_has_event_access(uuid) IS
  'Admin global; staff con staff_all_events; o event_staff activo con rol coincidente.';

-- -----------------------------------------------------------------------------
-- 3) Helpers de acceso kiosco (cajero)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.assert_cashier_kiosk_event_access(p_event_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'kiosk_orders: usuario no autenticado';
  END IF;

  IF public.is_admin() THEN
    RETURN;
  END IF;

  IF NOT public.is_cashier() THEN
    RAISE EXCEPTION 'kiosk_orders: permiso denegado';
  END IF;

  IF NOT public.staff_has_event_access(p_event_id) THEN
    RAISE EXCEPTION 'kiosk_orders: evento no autorizado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.kiosk_order_accessible_by_cashier(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kiosk_orders ko
    WHERE ko.id = p_order_id
      AND (
        public.is_admin()
        OR (
          public.is_cashier()
          AND public.staff_has_event_access(ko.event_id)
        )
      )
  );
$$;

-- -----------------------------------------------------------------------------
-- 4) Trigger: ventas manuales / gestión kiosco por evento (cajero)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_kiosk_orders_enforce_cashier_event_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Preventa pública: RPC SECURITY DEFINER con source = public
  IF NEW.source = 'public' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF public.is_cashier() THEN
    PERFORM public.assert_cashier_kiosk_event_access(NEW.event_id);
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_kiosk_orders_enforce_cashier_event_access
  ON public.kiosk_orders;

CREATE TRIGGER trg_kiosk_orders_enforce_cashier_event_access
  BEFORE INSERT OR UPDATE ON public.kiosk_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_kiosk_orders_enforce_cashier_event_access();

-- -----------------------------------------------------------------------------
-- 5) RLS kiosco — scope por evento para cajero (portero sin acceso)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS event_kiosk_products_select_cashier ON public.event_kiosk_products;

CREATE POLICY event_kiosk_products_select_cashier
  ON public.event_kiosk_products
  FOR SELECT
  TO authenticated
  USING (
    public.is_cashier()
    AND public.staff_has_event_access(event_id)
  );

DROP POLICY IF EXISTS kiosk_orders_cashier_select ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_insert ON public.kiosk_orders;
DROP POLICY IF EXISTS kiosk_orders_cashier_update ON public.kiosk_orders;

CREATE POLICY kiosk_orders_cashier_select
  ON public.kiosk_orders
  FOR SELECT
  TO authenticated
  USING (
    public.is_cashier()
    AND public.staff_has_event_access(event_id)
  );

CREATE POLICY kiosk_orders_cashier_insert
  ON public.kiosk_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_cashier()
    AND public.staff_has_event_access(event_id)
  );

CREATE POLICY kiosk_orders_cashier_update
  ON public.kiosk_orders
  FOR UPDATE
  TO authenticated
  USING (
    public.is_cashier()
    AND public.staff_has_event_access(event_id)
  )
  WITH CHECK (
    public.is_cashier()
    AND public.staff_has_event_access(event_id)
  );

DROP POLICY IF EXISTS kiosk_order_items_cashier_select ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_insert ON public.kiosk_order_items;
DROP POLICY IF EXISTS kiosk_order_items_cashier_update ON public.kiosk_order_items;

CREATE POLICY kiosk_order_items_cashier_select
  ON public.kiosk_order_items
  FOR SELECT
  TO authenticated
  USING (public.kiosk_order_accessible_by_cashier(order_id));

CREATE POLICY kiosk_order_items_cashier_insert
  ON public.kiosk_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.kiosk_order_accessible_by_cashier(order_id));

CREATE POLICY kiosk_order_items_cashier_update
  ON public.kiosk_order_items
  FOR UPDATE
  TO authenticated
  USING (public.kiosk_order_accessible_by_cashier(order_id))
  WITH CHECK (public.kiosk_order_accessible_by_cashier(order_id));

COMMENT ON TABLE public.kiosk_orders IS
  'RLS: admin todo; cajero solo eventos autorizados (staff_has_event_access); preventa pública vía RPC.';

-- -----------------------------------------------------------------------------
-- 6) RPC mark_ticket_used — admin o portero con acceso al evento
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.mark_ticket_used(p_ticket_id uuid)
RETURNS TABLE (
  ticket_id uuid,
  event_id uuid,
  ticket_status text,
  used_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'mark_ticket_used: usuario no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
  ) THEN
    RAISE EXCEPTION 'mark_ticket_used: usuario inactivo';
  END IF;

  IF NOT public.is_admin() AND NOT public.is_door() THEN
    RAISE EXCEPTION 'mark_ticket_used: permiso denegado';
  END IF;

  SELECT *
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mark_ticket_used: entrada no encontrada';
  END IF;

  IF NOT public.is_admin() THEN
    IF NOT public.staff_has_event_access(v_ticket.event_id) THEN
      RAISE EXCEPTION 'mark_ticket_used: evento no autorizado';
    END IF;
  END IF;

  IF v_ticket.ticket_status = 'used' THEN
    RAISE EXCEPTION 'mark_ticket_used: entrada ya utilizada';
  END IF;

  IF v_ticket.ticket_status = 'cancelled' THEN
    RAISE EXCEPTION 'mark_ticket_used: entrada cancelada';
  END IF;

  IF v_ticket.ticket_status = 'expired' THEN
    RAISE EXCEPTION 'mark_ticket_used: entrada vencida';
  END IF;

  IF v_ticket.ticket_status <> 'valid' THEN
    RAISE EXCEPTION 'mark_ticket_used: entrada no válida para ingreso';
  END IF;

  UPDATE public.tickets
  SET
    ticket_status = 'used',
    used_by = auth.uid(),
    used_at = now(),
    updated_at = now()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN QUERY
  SELECT
    v_ticket.id,
    v_ticket.event_id,
    v_ticket.ticket_status,
    v_ticket.used_at;
END;
$$;

COMMENT ON FUNCTION public.mark_ticket_used(uuid) IS
  'Marca entrada como usada. Admin global; portero solo con acceso al evento. FOR UPDATE evita doble validación.';

REVOKE ALL ON FUNCTION public.mark_ticket_used(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_ticket_used(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 7) RPCs kiosco — validar acceso al evento (SECURITY DEFINER)
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

  PERFORM public.assert_cashier_kiosk_event_access(v_order.event_id);

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

  PERFORM public.assert_cashier_kiosk_event_access(v_order.event_id);

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

  PERFORM public.assert_cashier_kiosk_event_access(v_order.event_id);

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

  PERFORM public.assert_cashier_kiosk_event_access(v_order.event_id);

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

-- create_manual_kiosk_order: validación vía trigger + assert en RPCs de gestión.
-- Añadir chequeo explícito post-evento en la función vigente:

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
  v_catalog_id uuid;
  v_order_item_id uuid;
  v_apply_community boolean;
  v_unit_price numeric(12, 2);
  v_community_applied numeric(12, 2);
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

  PERFORM public.assert_cashier_kiosk_event_access(p_event_id);

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

  v_apply_community := public.kiosk_qualifies_for_community_price(
    NULL,
    NULLIF(btrim(p_buyer_dni), ''),
    p_ticket_id
  );

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

  FOR v_catalog_id IN
    SELECT DISTINCT ekp.product_id
    FROM public.event_kiosk_products ekp
    WHERE ekp.id = ANY (v_ids)
    ORDER BY ekp.product_id
  LOOP
    SELECT *
    INTO v_catalog
    FROM public.kiosk_products
    WHERE id = v_catalog_id
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

    IF NOT v_row.cashier_sale_enabled THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: producto no disponible';
    END IF;

    SELECT *
    INTO v_catalog
    FROM public.kiosk_products
    WHERE id = v_row.product_id;

    IF NOT FOUND OR v_catalog.is_active = false THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: producto del catálogo inactivo';
    END IF;

    IF v_row.max_per_order IS NOT NULL AND v_quantity > v_row.max_per_order THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: max_per_order_exceeded';
    END IF;

    IF (v_catalog.stock_on_hand - v_catalog.stock_reserved) < v_quantity THEN
      RAISE EXCEPTION 'create_manual_kiosk_order: stock insuficiente';
    END IF;

    SELECT price.unit_price, price.community_price_applied
    INTO v_unit_price, v_community_applied
    FROM public.kiosk_event_product_unit_price(
      v_row.price,
      v_row.community_price,
      v_apply_community
    ) AS price;

    v_total := v_total + (v_unit_price * v_quantity);
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

    SELECT price.unit_price, price.community_price_applied
    INTO v_unit_price, v_community_applied
    FROM public.kiosk_event_product_unit_price(
      v_row.price,
      v_row.community_price,
      v_apply_community
    ) AS price;

    v_subtotal := v_unit_price * v_quantity;

    INSERT INTO public.kiosk_order_items (
      order_id,
      event_kiosk_product_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      subtotal,
      community_price_applied
    )
    VALUES (
      v_order_id,
      v_product_id,
      v_row.product_id,
      v_product_name,
      v_unit_price,
      v_quantity,
      v_subtotal,
      v_community_applied
    )
    RETURNING id INTO v_order_item_id;

    IF p_payment_status = 'paid' THEN
      PERFORM public.kiosk_global_direct_sale(
        v_row.product_id,
        v_quantity,
        p_event_id,
        v_order_id,
        v_order_item_id,
        'Venta manual pagada'
      );
    ELSE
      PERFORM public.kiosk_global_reserve_stock(
        v_row.product_id,
        v_quantity,
        p_event_id,
        v_order_id,
        v_order_item_id,
        'Reserva venta manual'
      );
    END IF;
  END LOOP;

  SELECT ko.order_code, ko.total_amount
  INTO v_order_code, v_total
  FROM public.kiosk_orders ko
  WHERE ko.id = v_order_id;

  RETURN QUERY
  SELECT v_order_id, v_order_code, v_total;
END;
$$;

-- -----------------------------------------------------------------------------
-- 8) Índices de soporte
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_profiles_role_internal
  ON public.profiles (role)
  WHERE role IN ('admin', 'cashier', 'door');

CREATE INDEX IF NOT EXISTS idx_event_staff_user_event_role_active
  ON public.event_staff (user_id, event_id, role)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tickets_event_status
  ON public.tickets (event_id, ticket_status);
