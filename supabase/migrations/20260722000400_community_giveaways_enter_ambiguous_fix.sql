-- Fix ambiguous entry_quantity references in enter_community_giveaway (RETURNS TABLE vs table column)
CREATE OR REPLACE FUNCTION public.enter_community_giveaway(
  p_giveaway_id uuid,
  p_user_id uuid,
  p_requested_quantity integer DEFAULT 1,
  p_request_id text DEFAULT NULL
)
RETURNS TABLE (
  entry_id uuid,
  entry_quantity integer,
  points_spent integer,
  points_balance_after integer,
  total_user_entries integer,
  total_user_chances integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_giveaway public.community_giveaways%ROWTYPE;
  v_member public.community_members%ROWTYPE;
  v_account public.loyalty_accounts%ROWTYPE;
  v_settings public.community_settings%ROWTYPE;
  v_existing public.community_giveaway_entries%ROWTYPE;
  v_idempotency_key text;
  v_request_qty integer;
  v_level_bonus integer;
  v_final_qty integer;
  v_user_entries integer;
  v_user_chances integer;
  v_points_per_entry integer;
  v_total_points integer;
  v_new_balance integer;
  v_tx_id uuid;
  v_entry_id uuid;
  v_level_id uuid;
BEGIN
  IF p_giveaway_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'parámetros inválidos';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_admin()
     AND COALESCE(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  IF p_request_id IS NULL OR length(trim(p_request_id)) = 0 THEN
    RAISE EXCEPTION 'request_id requerido';
  END IF;

  v_request_qty := COALESCE(p_requested_quantity, 1);
  IF v_request_qty < 1 THEN
    RAISE EXCEPTION 'cantidad inválida';
  END IF;

  v_idempotency_key := 'giveaway:' || p_giveaway_id::text
    || ':user:' || p_user_id::text
    || ':request:' || trim(p_request_id);

  SELECT * INTO v_existing
  FROM public.community_giveaway_entries
  WHERE idempotency_key = v_idempotency_key;

  IF FOUND THEN
  SELECT COALESCE(SUM(e.entry_quantity), 0)::integer,
         COALESCE(SUM(CASE WHEN e.status = 'active' THEN e.entry_quantity ELSE 0 END), 0)::integer
    INTO v_user_entries, v_user_chances
    FROM public.community_giveaway_entries e
    WHERE e.giveaway_id = p_giveaway_id
      AND e.user_id = p_user_id;

    SELECT points_balance INTO v_new_balance
    FROM public.loyalty_accounts
    WHERE user_id = p_user_id;

    entry_id := v_existing.id;
    entry_quantity := v_existing.entry_quantity;
    points_spent := COALESCE((v_existing.metadata ->> 'points_spent')::integer, 0);
    points_balance_after := COALESCE(v_new_balance, 0);
    total_user_entries := v_user_entries;
    total_user_chances := v_user_chances;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO v_giveaway
  FROM public.community_giveaways
  WHERE id = p_giveaway_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sorteo no encontrado';
  END IF;

  IF v_giveaway.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'el sorteo no está abierto para participación';
  END IF;

  IF v_giveaway.starts_at IS NOT NULL AND v_giveaway.starts_at > now() THEN
    RAISE EXCEPTION 'el sorteo aún no comenzó';
  END IF;

  IF v_giveaway.closes_at IS NOT NULL AND v_giveaway.closes_at < now() THEN
    RAISE EXCEPTION 'el sorteo ya cerró';
  END IF;

  SELECT * INTO v_settings FROM public.community_settings WHERE id = 1;
  IF NOT COALESCE(v_settings.community_enabled, false) THEN
    RAISE EXCEPTION 'programa deshabilitado';
  END IF;

  SELECT * INTO v_member
  FROM public.community_members
  WHERE profile_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  PERFORM public._giveaway_validate_eligibility(v_giveaway, p_user_id, v_member);

  IF v_giveaway.entry_type IN ('ticket', 'attendance', 'store_purchase', 'automatic') THEN
    RAISE EXCEPTION 'este sorteo no admite participación manual';
  END IF;

  IF v_giveaway.entry_type = 'free' AND v_request_qty > 1 AND NOT v_giveaway.allow_multiple_entries THEN
    RAISE EXCEPTION 'solo se permite una participación';
  END IF;

  IF v_giveaway.entry_type = 'points' AND NOT v_giveaway.allow_multiple_entries AND v_request_qty > 1 THEN
    RAISE EXCEPTION 'solo se permite una participación';
  END IF;

  SELECT COALESCE(SUM(e.entry_quantity), 0)::integer,
         COALESCE(SUM(CASE WHEN e.status = 'active' THEN e.entry_quantity ELSE 0 END), 0)::integer
    INTO v_user_entries, v_user_chances
    FROM public.community_giveaway_entries e
    WHERE e.giveaway_id = p_giveaway_id
      AND e.user_id = p_user_id
      AND e.status = 'active';

  SELECT current_level_id INTO v_level_id
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id;

  v_level_bonus := public._giveaway_level_bonus_quantity(v_giveaway.level_bonus_config, v_level_id);

  IF v_giveaway.entry_type IN ('free', 'mixed') THEN
    v_final_qty := v_level_bonus * v_request_qty;
  ELSE
    v_final_qty := v_request_qty;
  END IF;

  IF v_final_qty < 1 THEN
    v_final_qty := 1;
  END IF;

  IF v_giveaway.max_entries_per_user IS NOT NULL THEN
    IF (v_user_entries + v_final_qty) > v_giveaway.max_entries_per_user THEN
      RAISE EXCEPTION 'límite de participaciones alcanzado';
    END IF;
  ELSIF NOT v_giveaway.allow_multiple_entries AND v_user_chances > 0 THEN
    RAISE EXCEPTION 'ya participaste en este sorteo';
  END IF;

  v_points_per_entry := 0;
  v_total_points := 0;

  IF v_giveaway.entry_type IN ('points', 'mixed') THEN
    v_points_per_entry := v_giveaway.points_cost;
    v_total_points := v_points_per_entry * v_request_qty;

    IF v_total_points <= 0 THEN
      RAISE EXCEPTION 'costo de puntos inválido';
    END IF;

    INSERT INTO public.loyalty_accounts (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT * INTO v_account
    FROM public.loyalty_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF v_account.points_balance < v_total_points THEN
      RAISE EXCEPTION 'saldo insuficiente';
    END IF;

    v_new_balance := v_account.points_balance - v_total_points;

    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance,
        updated_at = now()
    WHERE user_id = p_user_id;

    INSERT INTO public.loyalty_transactions (
      user_id, transaction_type, points, balance_after,
      source_type, source_id, idempotency_key, description, metadata
    )
    VALUES (
      p_user_id, 'redeem', -v_total_points, v_new_balance,
      'giveaway', p_giveaway_id::text, v_idempotency_key,
      'Participación sorteo: ' || v_giveaway.name,
      jsonb_build_object('giveaway_id', p_giveaway_id, 'request_id', p_request_id)
    )
    RETURNING id INTO v_tx_id;

    PERFORM public._giveaway_audit_log(
      p_giveaway_id, p_user_id, 'points_debited', 'entry', NULL,
      NULL,
      jsonb_build_object('points', v_total_points, 'request_id', p_request_id),
      jsonb_build_object('idempotency_key', v_idempotency_key)
    );
  ELSE
    SELECT points_balance INTO v_new_balance
    FROM public.loyalty_accounts
    WHERE user_id = p_user_id;
    v_new_balance := COALESCE(v_new_balance, 0);
  END IF;

  INSERT INTO public.community_giveaway_entries (
    giveaway_id, user_id, community_member_id, entry_quantity,
    source_type, source_reference_id, points_transaction_id,
    status, idempotency_key, metadata
  )
  VALUES (
    p_giveaway_id, p_user_id, v_member.id, v_final_qty,
    CASE
      WHEN v_giveaway.entry_type IN ('points', 'mixed') THEN 'points'
      ELSE 'free'
    END,
    p_request_id,
    v_tx_id,
    'active',
    v_idempotency_key,
    jsonb_build_object(
      'points_spent', v_total_points,
      'requested_quantity', v_request_qty,
      'level_bonus', v_level_bonus
    )
  )
  RETURNING id INTO v_entry_id;

  PERFORM public._giveaway_audit_log(
    p_giveaway_id, p_user_id, 'entry_created', 'entry', v_entry_id,
    NULL,
    jsonb_build_object(
      'entry_quantity', v_final_qty,
      'points_spent', v_total_points,
      'source_type', CASE WHEN v_giveaway.entry_type IN ('points', 'mixed') THEN 'points' ELSE 'free' END
    ),
    jsonb_build_object('request_id', p_request_id)
  );

  v_user_chances := v_user_chances + v_final_qty;
  v_user_entries := v_user_entries + v_final_qty;

  entry_id := v_entry_id;
  entry_quantity := v_final_qty;
  points_spent := v_total_points;
  points_balance_after := v_new_balance;
  total_user_entries := v_user_entries;
  total_user_chances := v_user_chances;
  RETURN NEXT;
END;
$$;

ALTER FUNCTION public.enter_community_giveaway(uuid, uuid, integer, text) SET search_path = public, pg_temp;

