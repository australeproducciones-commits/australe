-- =============================================================================
-- Cancelación atómica de entradas con reverso estricto de fidelización
-- Reemplaza cancel_ticket: ticket + stock + puntos en una sola transacción.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cancel_ticket(
  p_ticket_id uuid,
  p_cancel_reason text DEFAULT NULL,
  p_mark_as_expired boolean DEFAULT false
)
RETURNS public.tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ticket public.tickets;
  v_ticket_type public.ticket_types;
  v_reason text;
  v_release_stock boolean;
  v_earn_key text;
  v_reversal_key text;
  v_earn_tx public.loyalty_transactions%ROWTYPE;
  v_reversal_id uuid;
  v_points_to_reverse integer;
  v_balance integer;
  v_lifetime integer;
  v_new_balance integer;
  v_new_lifetime integer;
  v_tx_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'cancel_ticket: usuario no autenticado';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'cancel_ticket: solo administradores pueden cancelar entradas';
  END IF;

  SELECT *
  INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cancel_ticket: entrada no encontrada';
  END IF;

  -- Idempotencia: ya cancelada o vencida → devolver sin modificar nada
  IF v_ticket.ticket_status IN ('cancelled', 'expired') THEN
    RETURN v_ticket;
  END IF;

  IF v_ticket.ticket_status = 'used' THEN
    RAISE EXCEPTION 'cancel_ticket: la entrada ya fue usada';
  END IF;

  v_earn_key := 'ticket:' || p_ticket_id::text || ':earn';
  v_reversal_key := 'ticket:' || p_ticket_id::text || ':reversal';

  SELECT *
  INTO v_earn_tx
  FROM public.loyalty_transactions
  WHERE idempotency_key = v_earn_key
    AND transaction_type = 'earn';

  IF FOUND
     AND v_earn_tx.points > 0
     AND v_ticket.user_id IS NOT NULL THEN

    SELECT id
    INTO v_reversal_id
    FROM public.loyalty_transactions
    WHERE idempotency_key = v_reversal_key;

    IF v_reversal_id IS NULL THEN
      v_points_to_reverse := v_earn_tx.points;

      SELECT points_balance, lifetime_points
      INTO v_balance, v_lifetime
      FROM public.loyalty_accounts
      WHERE user_id = v_ticket.user_id
      FOR UPDATE;

      IF v_balance IS NULL OR v_balance < v_points_to_reverse THEN
        RAISE EXCEPTION
          'LOYALTY_POINTS_ALREADY_SPENT: insufficient loyalty balance to reverse ticket points';
      END IF;

      v_new_balance := v_balance - v_points_to_reverse;
      v_new_lifetime := v_lifetime - v_points_to_reverse;

      IF v_new_lifetime < 0 THEN
        RAISE EXCEPTION
          'LOYALTY_POINTS_ALREADY_SPENT: insufficient loyalty balance to reverse ticket points';
      END IF;

      UPDATE public.loyalty_accounts
      SET points_balance = v_new_balance,
          lifetime_points = v_new_lifetime,
          updated_at = now()
      WHERE user_id = v_ticket.user_id;

      INSERT INTO public.loyalty_transactions (
        user_id, transaction_type, points, balance_after,
        source_type, source_id, idempotency_key, description, metadata, created_by
      )
      VALUES (
        v_ticket.user_id,
        'reversal',
        -v_points_to_reverse,
        v_new_balance,
        'ticket',
        p_ticket_id::text,
        v_reversal_key,
        'Reverso por cancelación de entrada',
        jsonb_build_object('ticket_id', p_ticket_id),
        v_user_id
      )
      RETURNING id INTO v_tx_id;

      PERFORM public.recalculate_loyalty_level(v_ticket.user_id);
    END IF;
  END IF;

  v_release_stock := v_ticket.ticket_status IN ('reserved', 'valid');

  IF v_release_stock AND v_ticket.ticket_type_id IS NOT NULL THEN
    SELECT *
    INTO v_ticket_type
    FROM public.ticket_types
    WHERE id = v_ticket.ticket_type_id
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.ticket_types
      SET stock_sold = GREATEST(0, stock_sold - 1)
      WHERE id = v_ticket.ticket_type_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'cancel_ticket: no se pudo liberar stock';
      END IF;
    END IF;
  END IF;

  v_reason := NULLIF(btrim(p_cancel_reason), '');

  IF v_reason IS NULL THEN
    IF p_mark_as_expired THEN
      v_reason := 'Reserva vencida';
    ELSE
      v_reason := 'Cancelada por administrador';
    END IF;
  END IF;

  UPDATE public.tickets
  SET
    payment_status = 'cancelled',
    ticket_status = CASE
      WHEN p_mark_as_expired THEN 'expired'
      ELSE 'cancelled'
    END,
    cancelled_at = now(),
    cancelled_by = v_user_id,
    cancel_reason = v_reason
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

COMMENT ON FUNCTION public.cancel_ticket(uuid, text, boolean) IS
  'Cancelación admin atómica con reverso estricto de puntos: bloquea ticket, valida saldo fidelización, revierte puntos completos o aborta, libera stock y cancela en una transacción.';

ALTER FUNCTION public.cancel_ticket(uuid, text, boolean) SET search_path = public;

-- Alinear reverse_loyalty_points_for_ticket: reverso estricto (sin LEAST parcial)
CREATE OR REPLACE FUNCTION public.reverse_loyalty_points_for_ticket(p_ticket_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_original public.loyalty_transactions%ROWTYPE;
  v_key text;
  v_reversal_key text;
  v_balance integer;
  v_lifetime integer;
  v_new_balance integer;
  v_new_lifetime integer;
  v_tx_id uuid;
BEGIN
  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND OR v_ticket.user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_key := 'ticket:' || p_ticket_id::text || ':earn';
  v_reversal_key := 'ticket:' || p_ticket_id::text || ':reversal';

  SELECT id INTO v_tx_id
  FROM public.loyalty_transactions
  WHERE idempotency_key = v_reversal_key;

  IF v_tx_id IS NOT NULL THEN
    RETURN v_tx_id;
  END IF;

  SELECT * INTO v_original
  FROM public.loyalty_transactions
  WHERE idempotency_key = v_key
    AND transaction_type = 'earn';

  IF NOT FOUND OR v_original.points <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT points_balance, lifetime_points
  INTO v_balance, v_lifetime
  FROM public.loyalty_accounts
  WHERE user_id = v_ticket.user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_original.points THEN
    RAISE EXCEPTION
      'LOYALTY_POINTS_ALREADY_SPENT: insufficient loyalty balance to reverse ticket points';
  END IF;

  v_new_balance := v_balance - v_original.points;
  v_new_lifetime := v_lifetime - v_original.points;

  IF v_new_lifetime < 0 THEN
    RAISE EXCEPTION
      'LOYALTY_POINTS_ALREADY_SPENT: insufficient loyalty balance to reverse ticket points';
  END IF;

  UPDATE public.loyalty_accounts
  SET points_balance = v_new_balance,
      lifetime_points = v_new_lifetime,
      updated_at = now()
  WHERE user_id = v_ticket.user_id;

  INSERT INTO public.loyalty_transactions (
    user_id, transaction_type, points, balance_after,
    source_type, source_id, idempotency_key, description, metadata
  )
  VALUES (
    v_ticket.user_id,
    'reversal',
    -v_original.points,
    v_new_balance,
    'ticket',
    p_ticket_id::text,
    v_reversal_key,
    'Reverso por cancelación de entrada',
    jsonb_build_object('ticket_id', p_ticket_id)
  )
  RETURNING id INTO v_tx_id;

  PERFORM public.recalculate_loyalty_level(v_ticket.user_id);

  RETURN v_tx_id;
END;
$$;

ALTER FUNCTION public.reverse_loyalty_points_for_ticket(uuid) SET search_path = public;
