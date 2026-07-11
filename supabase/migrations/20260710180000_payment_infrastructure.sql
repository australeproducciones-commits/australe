-- -----------------------------------------------------------------------------
-- Etapa 3: infraestructura genérica de pagos + reconciliación tienda / MP
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 1. payment_transactions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  module text NOT NULL DEFAULT 'store',
  order_id uuid NOT NULL,
  provider_preference_id text,
  provider_payment_id text,
  external_reference text NOT NULL,
  status text NOT NULL,
  status_detail text,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'ARS',
  payer_email text,
  approved_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_provider_payment_unique
  ON public.payment_transactions (provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_transactions_order_idx
  ON public.payment_transactions (order_id);

CREATE INDEX IF NOT EXISTS payment_transactions_preference_idx
  ON public.payment_transactions (provider_preference_id)
  WHERE provider_preference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_transactions_external_ref_idx
  ON public.payment_transactions (external_reference);

CREATE INDEX IF NOT EXISTS payment_transactions_module_order_idx
  ON public.payment_transactions (module, order_id);

-- -----------------------------------------------------------------------------
-- 2. payment_webhook_events
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text,
  request_id text,
  topic text,
  resource_id text,
  payload_hash text NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  processed_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_webhook_events_processing_status_check CHECK (
    processing_status IN ('pending', 'processing', 'processed', 'failed', 'ignored')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_events_request_unique
  ON public.payment_webhook_events (provider, request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_webhook_events_resource_idx
  ON public.payment_webhook_events (provider, resource_id);

-- -----------------------------------------------------------------------------
-- 3. Ampliar estados de store_orders
-- -----------------------------------------------------------------------------

ALTER TABLE public.store_orders
  DROP CONSTRAINT IF EXISTS store_orders_status_check;

ALTER TABLE public.store_orders
  ADD CONSTRAINT store_orders_status_check CHECK (
    status IN (
      'pending', 'reserved', 'paid', 'preparing', 'ready',
      'delivered', 'cancelled', 'expired', 'refunded', 'payment_review'
    )
  );

ALTER TABLE public.store_orders
  DROP CONSTRAINT IF EXISTS store_orders_payment_status_check;

ALTER TABLE public.store_orders
  ADD CONSTRAINT store_orders_payment_status_check CHECK (
    payment_status IN (
      'pending', 'confirmed', 'failed', 'refunded', 'cancelled', 'review'
    )
  );

-- -----------------------------------------------------------------------------
-- 4. RLS tablas de pagos
-- -----------------------------------------------------------------------------

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_transactions_admin_select ON public.payment_transactions;
CREATE POLICY payment_transactions_admin_select ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_cashier());

DROP POLICY IF EXISTS payment_webhook_events_admin_select ON public.payment_webhook_events;
CREATE POLICY payment_webhook_events_admin_select ON public.payment_webhook_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_webhook_events FROM anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT SELECT ON public.payment_webhook_events TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Registrar evento webhook (idempotente)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_payment_webhook_event(
  p_provider text,
  p_request_id text,
  p_topic text,
  p_resource_id text,
  p_payload_hash text
)
RETURNS TABLE (
  event_id uuid,
  is_duplicate boolean,
  processing_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.payment_webhook_events;
  v_id uuid;
BEGIN
  IF p_request_id IS NOT NULL AND length(trim(p_request_id)) > 0 THEN
    SELECT * INTO v_existing
    FROM public.payment_webhook_events
    WHERE provider = p_provider AND request_id = p_request_id;

    IF FOUND THEN
      RETURN QUERY SELECT v_existing.id, true, v_existing.processing_status;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.payment_webhook_events (
    provider, provider_event_id, request_id, topic, resource_id,
    payload_hash, processing_status, attempts
  )
  VALUES (
    p_provider, p_request_id, p_request_id, p_topic, p_resource_id,
    p_payload_hash, 'pending', 1
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, false, 'pending'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.register_payment_webhook_event(text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Reconciliar pago de pedido tienda (atómico, idempotente)
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
  v_outcome text;
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

  -- Upsert transacción de pago
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

  -- Idempotencia: ya confirmado con el mismo pago
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

  -- Estados terminales que no admiten confirmación automática
  IF v_order.status = 'delivered' THEN
    RETURN jsonb_build_object('outcome', 'invalid_state', 'order_id', p_order_id, 'order_status', v_order.status);
  END IF;

  v_reservation_active :=
    v_order.status IN ('pending', 'reserved')
    AND (v_order.reserved_until IS NULL OR v_order.reserved_until >= v_now);

  -- Pago aprobado
  IF p_provider_status = 'approved' THEN
    IF v_order.status IN ('expired', 'cancelled')
       OR (v_order.reserved_until IS NOT NULL AND v_order.reserved_until < v_now AND v_order.payment_status <> 'confirmed') THEN
      UPDATE public.store_orders
      SET
        status = 'payment_review',
        payment_status = 'review',
        payment_provider = p_provider,
        payment_reference = p_provider_payment_id,
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
        payment_reference = p_provider_payment_id,
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

    -- Confirmar stock
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
      payment_reference = p_provider_payment_id,
      paid_at = COALESCE(paid_at, v_now),
      reserved_until = NULL,
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

  -- Pendiente / en proceso
  IF p_provider_status IN ('pending', 'in_process') THEN
    UPDATE public.store_orders
    SET
      payment_provider = COALESCE(payment_provider, p_provider),
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

  -- Rechazado / cancelado
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

  -- Reembolsado
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

  -- Contracargo: revisión administrativa
  IF p_provider_status = 'charged_back' THEN
    UPDATE public.store_orders
    SET
      status = CASE WHEN status = 'paid' THEN 'payment_review' ELSE status END,
      payment_status = 'review',
      payment_provider = p_provider,
      payment_reference = p_provider_payment_id,
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

-- -----------------------------------------------------------------------------
-- 7. Marcar evento webhook procesado
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_payment_webhook_event(
  p_event_id uuid,
  p_status text,
  p_error_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payment_webhook_events
  SET
    processing_status = p_status,
    processed_at = CASE WHEN p_status = 'processed' THEN now() ELSE processed_at END,
    error_code = p_error_code,
    updated_at = now()
  WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_payment_webhook_event(uuid, text, text)
  FROM PUBLIC, anon, authenticated;
