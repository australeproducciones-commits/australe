-- Pagos híbridos tienda: canal manual vs Mercado Pago, confirmación atómica y auditoría.

ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS payment_channel text,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_amount_received numeric(12, 2),
  ADD COLUMN IF NOT EXISTS payment_confirmed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS payment_notes text,
  ADD COLUMN IF NOT EXISTS payment_review_reason text;

COMMENT ON COLUMN public.store_orders.payment_channel IS 'Canal elegido por el cliente: mercadopago | manual';
COMMENT ON COLUMN public.store_orders.payment_method IS 'Método confirmado: mercadopago | cash | bank_transfer | card_terminal | other';
COMMENT ON COLUMN public.store_orders.payment_amount_received IS 'Importe recibido en confirmación manual';
COMMENT ON COLUMN public.store_orders.payment_confirmed_by IS 'Usuario staff que confirmó pago manual';
COMMENT ON COLUMN public.store_orders.payment_notes IS 'Observación de confirmación manual (sin secretos)';
COMMENT ON COLUMN public.store_orders.payment_review_reason IS 'Motivo de payment_review';

CREATE INDEX IF NOT EXISTS store_orders_payment_channel_idx
  ON public.store_orders (payment_channel)
  WHERE payment_channel IS NOT NULL;

-- Backfill seguro para órdenes históricas (no inventar canal sin evidencia)
UPDATE public.store_orders
SET payment_channel = 'mercadopago'
WHERE payment_channel IS NULL
  AND payment_provider = 'mercadopago';

UPDATE public.store_orders
SET payment_channel = 'manual'
WHERE payment_channel IS NULL
  AND payment_provider = 'manual';

UPDATE public.store_orders
SET payment_method = 'mercadopago'
WHERE payment_method IS NULL
  AND payment_status = 'confirmed'
  AND payment_provider = 'mercadopago';

-- Órdenes manuales confirmadas vía mark_store_order_paid legacy usaban efectivo implícito
UPDATE public.store_orders
SET payment_method = 'cash'
WHERE payment_method IS NULL
  AND payment_status = 'confirmed'
  AND payment_provider = 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_orders_payment_channel_chk'
  ) THEN
    ALTER TABLE public.store_orders
      ADD CONSTRAINT store_orders_payment_channel_chk
      CHECK (payment_channel IS NULL OR payment_channel IN ('mercadopago', 'manual'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_orders_payment_method_chk'
  ) THEN
    ALTER TABLE public.store_orders
      ADD CONSTRAINT store_orders_payment_method_chk
      CHECK (
        payment_method IS NULL
        OR payment_method IN ('mercadopago', 'cash', 'bank_transfer', 'card_terminal', 'other')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'store_orders_payment_amount_received_chk'
  ) THEN
    ALTER TABLE public.store_orders
      ADD CONSTRAINT store_orders_payment_amount_received_chk
      CHECK (payment_amount_received IS NULL OR payment_amount_received >= 0);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Confirmación manual atómica e idempotente
-- Patrón A: invocada con sesión authenticated del cajero/admin (auth.uid() válido).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.confirm_store_manual_payment(
  p_order_id uuid,
  p_payment_method text,
  p_amount_received numeric,
  p_payment_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_item public.store_order_items;
  v_now timestamptz := now();
  v_reservation_active boolean;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.is_admin() OR public.is_cashier()) THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: permiso denegado';
  END IF;

  IF p_payment_method IS NULL OR p_payment_method NOT IN (
    'cash', 'bank_transfer', 'card_terminal', 'other'
  ) THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: método inválido';
  END IF;

  IF p_amount_received IS NULL OR p_amount_received <= 0 THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: importe inválido';
  END IF;

  SELECT * INTO v_order
  FROM public.store_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: pedido no encontrado';
  END IF;

  IF v_order.payment_status = 'confirmed' THEN
    RETURN jsonb_build_object(
      'outcome', 'already_confirmed',
      'order_id', p_order_id,
      'order_status', v_order.status,
      'payment_status', v_order.payment_status,
      'idempotent', true
    );
  END IF;

  IF v_order.payment_provider = 'mercadopago' AND v_order.payment_status = 'confirmed' THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: ya pagada con Mercado Pago';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payment_transactions pt
    WHERE pt.order_id = p_order_id
      AND pt.provider = 'mercadopago'
      AND pt.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: ya pagada con Mercado Pago';
  END IF;

  IF v_order.status IN ('cancelled', 'expired', 'refunded', 'delivered') THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: estado inválido';
  END IF;

  IF v_order.status = 'payment_review' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: requiere administrador';
  END IF;

  IF v_order.payment_channel = 'mercadopago'
     AND v_order.status NOT IN ('payment_review')
     AND v_order.payment_status NOT IN ('review', 'failed') THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: orden configurada para Mercado Pago';
  END IF;

  IF v_order.pickup_event_id IS NOT NULL
     AND NOT (public.is_admin() OR public.staff_has_event_access(v_order.pickup_event_id)) THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: sin acceso al evento';
  END IF;

  v_reservation_active :=
    v_order.status IN ('pending', 'reserved')
    AND (v_order.reserved_until IS NULL OR v_order.reserved_until >= v_now);

  IF NOT v_reservation_active AND v_order.status <> 'payment_review' THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: reserva expirada';
  END IF;

  IF p_amount_received <> v_order.total THEN
    RAISE EXCEPTION 'confirm_store_manual_payment: importe distinto al total';
  END IF;

  FOR v_item IN
    SELECT * FROM public.store_order_items WHERE order_id = p_order_id
  LOOP
    PERFORM public.store_confirm_sale(
      v_item.product_id, v_item.variant_id, v_item.quantity,
      p_order_id, v_order.event_id, 'confirm_store_manual_payment'
    );
  END LOOP;

  UPDATE public.store_orders
  SET
    status = 'paid',
    payment_status = 'confirmed',
    payment_provider = 'manual',
    payment_channel = COALESCE(payment_channel, 'manual'),
    payment_method = p_payment_method,
    payment_reference = NULLIF(btrim(p_payment_reference), ''),
    payment_amount_received = p_amount_received,
    payment_confirmed_by = auth.uid(),
    payment_notes = NULLIF(btrim(p_notes), ''),
    paid_at = v_now,
    reserved_until = NULL,
    payment_review_reason = NULL,
    updated_at = v_now
  WHERE id = p_order_id;

  PERFORM public.award_loyalty_points_for_store_order(p_order_id);

  RETURN jsonb_build_object(
    'outcome', 'confirmed',
    'order_id', p_order_id,
    'order_status', 'paid',
    'payment_status', 'confirmed',
    'idempotent', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_store_manual_payment(uuid, text, numeric, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_store_manual_payment(uuid, text, numeric, text, text)
  TO authenticated;

-- -----------------------------------------------------------------------------
-- Marcar pagado (legacy) — delega validaciones reforzadas
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
  v_result jsonb;
BEGIN
  IF p_payment_provider IS DISTINCT FROM 'manual' THEN
    RAISE EXCEPTION 'mark_store_order_paid: usar reconcile para Mercado Pago';
  END IF;

  v_result := public.confirm_store_manual_payment(
    p_order_id,
    'cash',
    (SELECT total FROM public.store_orders WHERE id = p_order_id),
    p_payment_reference,
    NULL
  );

  IF (v_result ->> 'outcome') = 'already_confirmed' THEN
    RETURN;
  END IF;
END;
$$;

-- create_store_order — reemplazar firma anterior por canal de pago
DROP FUNCTION IF EXISTS public.create_store_order(text, text, text, uuid, uuid, jsonb, boolean);

CREATE OR REPLACE FUNCTION public.create_store_order(
  p_customer_name text,
  p_customer_email text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_pickup_event_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_apply_community_price boolean DEFAULT false,
  p_payment_channel text DEFAULT NULL
)
RETURNS TABLE (
  order_id uuid,
  order_number text,
  total_amount numeric,
  pickup_code text,
  reserved_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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
  v_channel text;
BEGIN
  v_user_id := auth.uid();
  v_name := btrim(p_customer_name);
  v_email := NULLIF(btrim(p_customer_email), '');
  v_phone := NULLIF(btrim(p_customer_phone), '');
  v_channel := NULLIF(btrim(p_payment_channel), '');

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'create_store_order: nombre requerido';
  END IF;

  IF v_email IS NULL AND v_phone IS NULL THEN
    RAISE EXCEPTION 'create_store_order: contacto requerido';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'create_store_order: items requeridos';
  END IF;

  IF v_channel IS NOT NULL AND v_channel NOT IN ('mercadopago', 'manual') THEN
    RAISE EXCEPTION 'create_store_order: canal de pago inválido';
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
    payment_channel, payment_provider,
    subtotal, total,
    pickup_method, pickup_event_id,
    pickup_code, pickup_token_hash,
    reserved_until
  )
  VALUES (
    v_order_number, v_user_id, p_event_id,
    v_name, v_email, v_phone,
    'reserved', 'pending',
    v_channel,
    v_channel,
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
  reserved_until := v_reserved_until;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.create_store_order(text, text, text, uuid, uuid, jsonb, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_order(text, text, text, uuid, uuid, jsonb, boolean, text)
  TO authenticated, anon;

-- -----------------------------------------------------------------------------
-- reconcile_store_order_payment — conflicto manual + MP
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reconcile_store_order_payment(
  p_order_id uuid,
  p_provider text,
  p_provider_payment_id text,
  p_provider_preference_id text,
  p_external_reference text,
  p_amount numeric,
  p_currency text,
  p_provider_status text,
  p_status_detail text DEFAULT NULL,
  p_payer_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.store_orders;
  v_item public.store_order_items;
  v_tx_id uuid;
  v_expected_ref text;
  v_now timestamptz := now();
  v_reservation_active boolean;
BEGIN
  SELECT * INTO v_order
  FROM public.store_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('outcome', 'order_not_found', 'order_id', p_order_id);
  END IF;

  v_expected_ref := 'store:' || p_order_id::text;

  IF p_external_reference IS DISTINCT FROM v_expected_ref
     AND p_external_reference IS DISTINCT FROM v_order.order_number THEN
    RETURN jsonb_build_object(
      'outcome', 'reference_mismatch',
      'order_id', p_order_id,
      'expected_reference', v_expected_ref
    );
  END IF;

  IF p_currency IS DISTINCT FROM 'ARS' THEN
    RETURN jsonb_build_object('outcome', 'currency_mismatch', 'order_id', p_order_id);
  END IF;

  IF p_amount IS NULL OR p_amount <> v_order.total THEN
    RETURN jsonb_build_object(
      'outcome', 'amount_mismatch',
      'order_id', p_order_id,
      'expected_amount', v_order.total,
      'received_amount', p_amount
    );
  END IF;

  IF p_provider_payment_id IS NOT NULL THEN
    SELECT id INTO v_tx_id
    FROM public.payment_transactions
    WHERE provider = p_provider AND provider_payment_id = p_provider_payment_id;

    IF v_tx_id IS NULL THEN
      INSERT INTO public.payment_transactions (
        provider, module, order_id,
        provider_preference_id, provider_payment_id, external_reference,
        status, status_detail, amount, currency, payer_email,
        approved_at, refunded_at
      )
      VALUES (
        p_provider, 'store', p_order_id,
        p_provider_preference_id, p_provider_payment_id, COALESCE(p_external_reference, v_expected_ref),
        p_provider_status, p_status_detail, p_amount, p_currency, p_payer_email,
        CASE WHEN p_provider_status = 'approved' THEN v_now ELSE NULL END,
        CASE WHEN p_provider_status = 'refunded' THEN v_now ELSE NULL END
      )
      RETURNING id INTO v_tx_id;
    ELSE
      UPDATE public.payment_transactions
      SET
        status = p_provider_status,
        status_detail = COALESCE(p_status_detail, status_detail),
        provider_preference_id = COALESCE(p_provider_preference_id, provider_preference_id),
        payer_email = COALESCE(p_payer_email, payer_email),
        approved_at = CASE
          WHEN p_provider_status = 'approved' THEN COALESCE(approved_at, v_now)
          ELSE approved_at
        END,
        refunded_at = CASE
          WHEN p_provider_status = 'refunded' THEN COALESCE(refunded_at, v_now)
          ELSE refunded_at
        END,
        updated_at = v_now
      WHERE id = v_tx_id;
    END IF;
  ELSIF p_provider_preference_id IS NOT NULL THEN
    SELECT id INTO v_tx_id
    FROM public.payment_transactions
    WHERE provider = p_provider
      AND order_id = p_order_id
      AND provider_preference_id = p_provider_preference_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_tx_id IS NULL THEN
      INSERT INTO public.payment_transactions (
        provider, module, order_id,
        provider_preference_id, external_reference,
        status, status_detail, amount, currency
      )
      VALUES (
        p_provider, 'store', p_order_id,
        p_provider_preference_id, COALESCE(p_external_reference, v_expected_ref),
        COALESCE(p_provider_status, 'preference_created'), p_status_detail, p_amount, p_currency
      )
      RETURNING id INTO v_tx_id;
    END IF;
  END IF;

  -- Pago manual previo + webhook MP aprobado → revisión
  IF v_order.payment_status = 'confirmed'
     AND p_provider_status = 'approved'
     AND v_order.payment_provider = 'manual' THEN
    UPDATE public.store_orders
    SET
      status = 'payment_review',
      payment_status = 'review',
      payment_review_reason = 'duplicate_mp_after_manual',
      updated_at = v_now
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'outcome', 'payment_review',
      'order_id', p_order_id,
      'order_status', 'payment_review',
      'payment_status', 'review',
      'transaction_id', v_tx_id,
      'reason', 'duplicate_mp_after_manual'
    );
  END IF;

  IF v_order.payment_status = 'confirmed' THEN
    IF p_provider_status = 'approved' THEN
      RETURN jsonb_build_object(
        'outcome', 'already_confirmed',
        'order_id', p_order_id,
        'order_status', v_order.status,
        'payment_status', v_order.payment_status,
        'transaction_id', v_tx_id
      );
    END IF;
  END IF;

  IF v_order.status = 'delivered' THEN
    RETURN jsonb_build_object('outcome', 'invalid_state', 'order_id', p_order_id, 'order_status', v_order.status);
  END IF;

  v_reservation_active :=
    v_order.status IN ('pending', 'reserved')
    AND (v_order.reserved_until IS NULL OR v_order.reserved_until >= v_now);

  IF p_provider_status = 'approved' THEN
    IF v_order.status IN ('expired', 'cancelled')
       OR (v_order.reserved_until IS NOT NULL AND v_order.reserved_until < v_now AND v_order.payment_status <> 'confirmed') THEN
      UPDATE public.store_orders
      SET
        status = 'payment_review',
        payment_status = 'review',
        payment_provider = p_provider,
        payment_method = 'mercadopago',
        payment_reference = p_provider_payment_id,
        payment_review_reason = 'reservation_expired',
        updated_at = v_now
      WHERE id = p_order_id;

      RETURN jsonb_build_object(
        'outcome', 'payment_review',
        'order_id', p_order_id,
        'order_status', 'payment_review',
        'payment_status', 'review',
        'transaction_id', v_tx_id,
        'reason', 'reservation_expired'
      );
    END IF;

    IF NOT v_reservation_active AND v_order.payment_status <> 'confirmed' THEN
      UPDATE public.store_orders
      SET
        status = 'payment_review',
        payment_status = 'review',
        payment_provider = p_provider,
        payment_method = 'mercadopago',
        payment_reference = p_provider_payment_id,
        payment_review_reason = 'reservation_inactive',
        updated_at = v_now
      WHERE id = p_order_id;

      RETURN jsonb_build_object(
        'outcome', 'payment_review',
        'order_id', p_order_id,
        'order_status', 'payment_review',
        'payment_status', 'review',
        'transaction_id', v_tx_id,
        'reason', 'reservation_inactive'
      );
    END IF;

    FOR v_item IN
      SELECT * FROM public.store_order_items WHERE order_id = p_order_id
    LOOP
      PERFORM public.store_confirm_sale(
        v_item.product_id, v_item.variant_id, v_item.quantity,
        p_order_id, v_order.event_id, 'reconcile_store_order_payment'
      );
    END LOOP;

    UPDATE public.store_orders
    SET
      status = 'paid',
      payment_status = 'confirmed',
      payment_provider = p_provider,
      payment_method = 'mercadopago',
      payment_channel = COALESCE(payment_channel, 'mercadopago'),
      payment_reference = p_provider_payment_id,
      paid_at = COALESCE(paid_at, v_now),
      reserved_until = NULL,
      payment_review_reason = NULL,
      updated_at = v_now
    WHERE id = p_order_id;

    PERFORM public.award_loyalty_points_for_store_order(p_order_id);

    RETURN jsonb_build_object(
      'outcome', 'confirmed',
      'order_id', p_order_id,
      'order_status', 'paid',
      'payment_status', 'confirmed',
      'transaction_id', v_tx_id
    );
  END IF;

  IF p_provider_status IN ('pending', 'in_process') THEN
    UPDATE public.store_orders
    SET
      payment_provider = COALESCE(payment_provider, p_provider),
      payment_channel = COALESCE(payment_channel, 'mercadopago'),
      payment_reference = COALESCE(payment_reference, p_provider_payment_id),
      updated_at = v_now
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'outcome', 'pending',
      'order_id', p_order_id,
      'order_status', v_order.status,
      'payment_status', v_order.payment_status,
      'transaction_id', v_tx_id
    );
  END IF;

  IF p_provider_status IN ('rejected', 'cancelled') THEN
    IF v_reservation_active AND v_order.payment_status = 'pending' THEN
      UPDATE public.store_orders
      SET
        payment_status = 'failed',
        payment_provider = p_provider,
        payment_reference = p_provider_payment_id,
        updated_at = v_now
      WHERE id = p_order_id;
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'rejected',
      'order_id', p_order_id,
      'order_status', v_order.status,
      'payment_status', 'failed',
      'transaction_id', v_tx_id
    );
  END IF;

  IF p_provider_status = 'refunded' THEN
    IF v_order.payment_status = 'confirmed' AND v_order.status NOT IN ('cancelled', 'refunded') THEN
      PERFORM public.cancel_store_order(p_order_id, 'reembolso Mercado Pago');
      UPDATE public.store_orders
      SET status = 'refunded', payment_status = 'refunded', updated_at = v_now
      WHERE id = p_order_id;
    ELSE
      UPDATE public.store_orders
      SET payment_status = 'refunded', updated_at = v_now
      WHERE id = p_order_id;
    END IF;

    RETURN jsonb_build_object(
      'outcome', 'refunded',
      'order_id', p_order_id,
      'order_status', (SELECT status FROM public.store_orders WHERE id = p_order_id),
      'payment_status', 'refunded',
      'transaction_id', v_tx_id
    );
  END IF;

  IF p_provider_status = 'charged_back' THEN
    UPDATE public.store_orders
    SET
      status = CASE WHEN status = 'paid' THEN 'payment_review' ELSE status END,
      payment_status = 'review',
      payment_provider = p_provider,
      payment_reference = p_provider_payment_id,
      payment_review_reason = 'charged_back',
      updated_at = v_now
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
      'outcome', 'charged_back',
      'order_id', p_order_id,
      'order_status', (SELECT status FROM public.store_orders WHERE id = p_order_id),
      'payment_status', 'review',
      'transaction_id', v_tx_id
    );
  END IF;

  RETURN jsonb_build_object(
    'outcome', 'ignored',
    'order_id', p_order_id,
    'provider_status', p_provider_status,
    'transaction_id', v_tx_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.reconcile_store_order_payment(
  uuid, text, text, text, text, numeric, text, text, text, text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.mark_store_order_paid(uuid, text, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_store_order_paid(uuid, text, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
