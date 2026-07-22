-- =============================================================================
-- RPCs de sorteos de Comunidad
-- Participación, cancelación/reintegro, sorteo, mantenimiento
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: auditoría interna
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._giveaway_audit_log(
  p_giveaway_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_previous_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.community_giveaway_audit_logs (
    giveaway_id, actor_user_id, action, entity_type, entity_id,
    previous_data, new_data, metadata
  )
  VALUES (
    p_giveaway_id, p_actor_user_id, p_action, p_entity_type, p_entity_id,
    p_previous_data, p_new_data, p_metadata
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- Helper: bonus de nivel
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._giveaway_level_bonus_quantity(
  p_level_bonus_config jsonb,
  p_level_id uuid
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_default integer;
  v_by_level jsonb;
  v_bonus integer;
BEGIN
  v_default := COALESCE((p_level_bonus_config ->> 'default_quantity')::integer, 1);
  IF v_default < 1 THEN
    v_default := 1;
  END IF;

  IF p_level_id IS NULL THEN
    RETURN v_default;
  END IF;

  v_by_level := p_level_bonus_config -> 'by_level_id';
  IF v_by_level IS NOT NULL AND v_by_level ? p_level_id::text THEN
    v_bonus := (v_by_level ->> p_level_id::text)::integer;
    IF v_bonus IS NOT NULL AND v_bonus > 0 THEN
      RETURN v_bonus;
    END IF;
  END IF;

  RETURN v_default;
END;
$$;

-- -----------------------------------------------------------------------------
-- Helper: validar requisitos de elegibilidad
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._giveaway_validate_eligibility(
  p_giveaway public.community_giveaways,
  p_user_id uuid,
  p_member public.community_members
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.loyalty_accounts%ROWTYPE;
  v_level_min_points integer;
  v_user_level_points integer;
  v_has_ticket boolean;
  v_has_used_ticket boolean;
  v_store_total numeric;
BEGIN
  IF p_member IS NULL OR p_member.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'no sos miembro activo de Comunidad';
  END IF;

  IF p_giveaway.minimum_community_level IS NOT NULL THEN
    SELECT minimum_lifetime_points INTO v_level_min_points
    FROM public.community_levels
    WHERE id = p_giveaway.minimum_community_level;

    SELECT COALESCE(la.lifetime_points, 0) INTO v_user_level_points
    FROM public.loyalty_accounts la
    WHERE la.user_id = p_user_id;

    IF v_level_min_points IS NOT NULL AND COALESCE(v_user_level_points, 0) < v_level_min_points THEN
      RAISE EXCEPTION 'no cumplís el nivel mínimo requerido';
    END IF;
  END IF;

  IF p_giveaway.related_event_id IS NOT NULL
     AND (p_giveaway.requires_valid_ticket OR p_giveaway.requires_used_ticket) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.tickets t
      WHERE t.user_id = p_user_id
        AND t.event_id = p_giveaway.related_event_id
        AND t.ticket_status IN ('valid', 'used')
    ) INTO v_has_ticket;

    IF NOT v_has_ticket THEN
      RAISE EXCEPTION 'se requiere entrada válida para este evento';
    END IF;

    IF p_giveaway.requires_used_ticket THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.tickets t
        WHERE t.user_id = p_user_id
          AND t.event_id = p_giveaway.related_event_id
          AND t.ticket_status = 'used'
          AND t.used_at IS NOT NULL
      ) INTO v_has_used_ticket;

      IF NOT v_has_used_ticket THEN
        RAISE EXCEPTION 'se requiere asistencia confirmada al evento';
      END IF;
    END IF;
  END IF;

  IF p_giveaway.minimum_purchase_amount IS NOT NULL
     AND p_giveaway.minimum_purchase_amount > 0 THEN
    SELECT COALESCE(SUM(so.total), 0) INTO v_store_total
    FROM public.store_orders so
    WHERE so.user_id = p_user_id
      AND so.payment_status = 'confirmed';

    IF COALESCE(v_store_total, 0) < p_giveaway.minimum_purchase_amount THEN
      RAISE EXCEPTION 'no cumplís el monto mínimo de compra';
    END IF;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- enter_community_giveaway
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- create_automatic_giveaway_entry
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_automatic_giveaway_entry(
  p_giveaway_id uuid,
  p_user_id uuid,
  p_source_type text,
  p_source_reference_id text,
  p_entry_quantity integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_giveaway public.community_giveaways%ROWTYPE;
  v_member public.community_members%ROWTYPE;
  v_existing_id uuid;
  v_idempotency_key text;
  v_qty integer;
  v_entry_id uuid;
BEGIN
  IF p_giveaway_id IS NULL OR p_user_id IS NULL OR p_source_type IS NULL OR p_source_reference_id IS NULL THEN
    RAISE EXCEPTION 'parámetros inválidos';
  END IF;

  v_idempotency_key := 'giveaway:' || p_giveaway_id::text
    || ':' || p_source_type || ':' || p_source_reference_id;

  SELECT id INTO v_existing_id
  FROM public.community_giveaway_entries
  WHERE idempotency_key = v_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT * INTO v_giveaway
  FROM public.community_giveaways
  WHERE id = p_giveaway_id
  FOR UPDATE;

  IF NOT FOUND OR v_giveaway.status NOT IN ('active', 'scheduled') THEN
    RETURN NULL;
  END IF;

  IF v_giveaway.entry_type NOT IN ('ticket', 'attendance', 'store_purchase', 'automatic', 'mixed') THEN
    RETURN NULL;
  END IF;

  IF v_giveaway.starts_at IS NOT NULL AND v_giveaway.starts_at > now() THEN
    RETURN NULL;
  END IF;

  IF v_giveaway.closes_at IS NOT NULL AND v_giveaway.closes_at < now() THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_member
  FROM public.community_members
  WHERE profile_id = p_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  BEGIN
    PERFORM public._giveaway_validate_eligibility(v_giveaway, p_user_id, v_member);
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;

  v_qty := GREATEST(COALESCE(p_entry_quantity, 1), 1);

  INSERT INTO public.community_giveaway_entries (
    giveaway_id, user_id, community_member_id, entry_quantity,
    source_type, source_reference_id, status, idempotency_key, metadata
  )
  VALUES (
    p_giveaway_id, p_user_id, v_member.id, v_qty,
    p_source_type, p_source_reference_id,
    'active', v_idempotency_key,
    jsonb_build_object('automatic', true)
  )
  RETURNING id INTO v_entry_id;

  PERFORM public._giveaway_audit_log(
    p_giveaway_id, NULL, 'entry_created', 'entry', v_entry_id,
    NULL,
    jsonb_build_object('source_type', p_source_type, 'source_reference_id', p_source_reference_id),
    jsonb_build_object('automatic', true)
  );

  RETURN v_entry_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- cancel_community_giveaway (admin, idempotente en reintegros)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.cancel_community_giveaway(
  p_giveaway_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_giveaway public.community_giveaways%ROWTYPE;
  v_entry record;
  v_refund_key text;
  v_existing_tx uuid;
  v_points integer;
  v_balance integer;
  v_new_balance integer;
  v_refunded_count integer := 0;
BEGIN
  IF p_giveaway_id IS NULL OR p_admin_id IS NULL THEN
    RAISE EXCEPTION 'parámetros inválidos';
  END IF;

  IF NOT public.is_admin()
     AND COALESCE(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  SELECT * INTO v_giveaway
  FROM public.community_giveaways
  WHERE id = p_giveaway_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sorteo no encontrado';
  END IF;

  IF v_giveaway.status = 'drawn' THEN
    RAISE EXCEPTION 'no se puede cancelar un sorteo ya ejecutado';
  END IF;

  IF v_giveaway.status = 'cancelled' THEN
    RETURN jsonb_build_object('already_cancelled', true, 'refunded_entries', 0);
  END IF;

  UPDATE public.community_giveaways
  SET status = 'cancelled',
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_giveaway_id;

  FOR v_entry IN
    SELECT e.*
    FROM public.community_giveaway_entries e
    WHERE e.giveaway_id = p_giveaway_id
      AND e.status = 'active'
      AND e.points_transaction_id IS NOT NULL
  LOOP
    v_points := COALESCE((v_entry.metadata ->> 'points_spent')::integer, 0);
    IF v_points <= 0 THEN
      CONTINUE;
    END IF;

    v_refund_key := 'giveaway_refund:' || p_giveaway_id::text || ':entry:' || v_entry.id::text;

    SELECT id INTO v_existing_tx
    FROM public.loyalty_transactions
    WHERE idempotency_key = v_refund_key;

    IF v_existing_tx IS NOT NULL THEN
      UPDATE public.community_giveaway_entries
      SET status = 'refunded', refunded_at = now()
      WHERE id = v_entry.id AND status = 'active';
      CONTINUE;
    END IF;

    INSERT INTO public.loyalty_accounts (user_id)
    VALUES (v_entry.user_id)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT points_balance INTO v_balance
    FROM public.loyalty_accounts
    WHERE user_id = v_entry.user_id
    FOR UPDATE;

    v_new_balance := COALESCE(v_balance, 0) + v_points;

    UPDATE public.loyalty_accounts
    SET points_balance = v_new_balance,
        updated_at = now()
    WHERE user_id = v_entry.user_id;

    INSERT INTO public.loyalty_transactions (
      user_id, transaction_type, points, balance_after,
      source_type, source_id, idempotency_key, description, metadata, created_by
    )
    VALUES (
      v_entry.user_id, 'reversal', v_points, v_new_balance,
      'giveaway_refund', v_entry.id::text, v_refund_key,
      'Reintegro sorteo cancelado: ' || v_giveaway.name,
      jsonb_build_object('giveaway_id', p_giveaway_id, 'entry_id', v_entry.id),
      p_admin_id
    );

    UPDATE public.community_giveaway_entries
    SET status = 'refunded', refunded_at = now()
    WHERE id = v_entry.id;

    PERFORM public._giveaway_audit_log(
      p_giveaway_id, p_admin_id, 'points_refunded', 'entry', v_entry.id,
      jsonb_build_object('status', 'active'),
      jsonb_build_object('status', 'refunded', 'points', v_points),
      jsonb_build_object('reason', p_reason)
    );

    v_refunded_count := v_refunded_count + 1;
  END LOOP;

  UPDATE public.community_giveaway_entries
  SET status = 'cancelled', cancelled_at = now()
  WHERE giveaway_id = p_giveaway_id
    AND status = 'active'
    AND points_transaction_id IS NULL;

  PERFORM public._giveaway_audit_log(
    p_giveaway_id, p_admin_id, 'cancelled', 'giveaway', p_giveaway_id,
    jsonb_build_object('status', v_giveaway.status),
    jsonb_build_object('status', 'cancelled'),
    jsonb_build_object('reason', p_reason, 'refunded_entries', v_refunded_count)
  );

  RETURN jsonb_build_object(
    'cancelled', true,
    'refunded_entries', v_refunded_count
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- disqualify_community_giveaway_entry
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.disqualify_community_giveaway_entry(
  p_entry_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.community_giveaway_entries%ROWTYPE;
BEGIN
  IF p_entry_id IS NULL OR p_admin_id IS NULL THEN
    RAISE EXCEPTION 'parámetros inválidos';
  END IF;

  IF NOT public.is_admin()
     AND COALESCE(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  SELECT * INTO v_entry
  FROM public.community_giveaway_entries
  WHERE id = p_entry_id
  FOR UPDATE;

  IF NOT FOUND OR v_entry.status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'participación no válida';
  END IF;

  UPDATE public.community_giveaway_entries
  SET status = 'disqualified',
      disqualified_at = now(),
      metadata = metadata || jsonb_build_object('disqualify_reason', p_reason)
  WHERE id = p_entry_id;

  PERFORM public._giveaway_audit_log(
    v_entry.giveaway_id, p_admin_id, 'entry_disqualified', 'entry', p_entry_id,
    jsonb_build_object('status', 'active'),
    jsonb_build_object('status', 'disqualified', 'reason', p_reason),
    '{}'::jsonb
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- draw_community_giveaway
-- Aleatoriedad: ORDER BY md5(entry_id || random_bytes) para orden uniforme
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.draw_community_giveaway(
  p_giveaway_id uuid,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_giveaway public.community_giveaways%ROWTYPE;
  v_pool record;
  v_selected_users uuid[] := ARRAY[]::uuid[];
  v_winner_count integer := 0;
  v_alternate_count integer := 0;
  v_position integer;
  v_code text;
  v_winner_id uuid;
  v_total_participants integer;
  v_total_chances integer;
  v_draw_seed text;
BEGIN
  IF p_giveaway_id IS NULL OR p_admin_id IS NULL THEN
    RAISE EXCEPTION 'parámetros inválidos';
  END IF;

  IF NOT public.is_admin()
     AND COALESCE(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  SELECT * INTO v_giveaway
  FROM public.community_giveaways
  WHERE id = p_giveaway_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sorteo no encontrado';
  END IF;

  IF v_giveaway.status = 'drawn' THEN
    RETURN jsonb_build_object(
      'already_drawn', true,
      'drawn_at', v_giveaway.drawn_at
    );
  END IF;

  IF v_giveaway.status = 'cancelled' THEN
    RAISE EXCEPTION 'el sorteo fue cancelado';
  END IF;

  IF v_giveaway.status NOT IN ('active', 'closed') THEN
    RAISE EXCEPTION 'el sorteo no está listo para ejecutarse';
  END IF;

  UPDATE public.community_giveaways
  SET status = 'closed',
      updated_at = now()
  WHERE id = p_giveaway_id
    AND status = 'active';

  SELECT COUNT(DISTINCT user_id)::integer,
         COALESCE(SUM(entry_quantity), 0)::integer
    INTO v_total_participants, v_total_chances
    FROM public.community_giveaway_entries
    WHERE giveaway_id = p_giveaway_id
      AND status = 'active';

  v_draw_seed := encode(gen_random_bytes(32), 'hex');

  -- Ganadores principales
  v_position := 0;
  FOR v_pool IN
    WITH expanded AS (
      SELECT e.id AS entry_id, e.user_id, gs.i AS chance_index
      FROM public.community_giveaway_entries e
      CROSS JOIN generate_series(1, e.entry_quantity) AS gs(i)
      WHERE e.giveaway_id = p_giveaway_id
        AND e.status = 'active'
    ),
    shuffled AS (
      SELECT entry_id, user_id,
        md5(entry_id::text || ':' || chance_index::text || ':' || v_draw_seed) AS rnd
      FROM expanded
    )
    SELECT entry_id, user_id
    FROM shuffled
    ORDER BY rnd
  LOOP
  EXIT WHEN v_winner_count >= v_giveaway.winner_count;

    IF NOT v_giveaway.allow_duplicate_winners
       AND v_pool.user_id = ANY (v_selected_users) THEN
      CONTINUE;
    END IF;

    v_position := v_position + 1;
    v_code := 'GV-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12));

    INSERT INTO public.community_giveaway_winners (
      giveaway_id, user_id, entry_id, position, winner_type,
      status, verification_code, metadata
    )
    VALUES (
      p_giveaway_id, v_pool.user_id, v_pool.entry_id, v_position, 'winner',
      'selected', v_code,
      jsonb_build_object('draw_seed_hash', md5(v_draw_seed))
    )
    RETURNING id INTO v_winner_id;

    v_selected_users := array_append(v_selected_users, v_pool.user_id);
    v_winner_count := v_winner_count + 1;

    PERFORM public._giveaway_audit_log(
      p_giveaway_id, p_admin_id, 'winner_selected', 'winner', v_winner_id,
      NULL,
      jsonb_build_object('position', v_position, 'user_id', v_pool.user_id),
      jsonb_build_object('winner_type', 'winner')
    );
  END LOOP;

  -- Suplentes
  v_position := 0;
  FOR v_pool IN
    WITH expanded AS (
      SELECT e.id AS entry_id, e.user_id, gs.i AS chance_index
      FROM public.community_giveaway_entries e
      CROSS JOIN generate_series(1, e.entry_quantity) AS gs(i)
      WHERE e.giveaway_id = p_giveaway_id
        AND e.status = 'active'
    ),
    shuffled AS (
      SELECT entry_id, user_id,
        md5(entry_id::text || ':alt:' || chance_index::text || ':' || v_draw_seed) AS rnd
      FROM expanded
    )
    SELECT entry_id, user_id
    FROM shuffled
    ORDER BY rnd
  LOOP
  EXIT WHEN v_alternate_count >= v_giveaway.alternate_count;

    IF NOT v_giveaway.allow_duplicate_winners
       AND v_pool.user_id = ANY (v_selected_users) THEN
      CONTINUE;
    END IF;

    v_position := v_position + 1;
    v_code := 'GV-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12));

    INSERT INTO public.community_giveaway_winners (
      giveaway_id, user_id, entry_id, position, winner_type,
      status, verification_code, metadata
    )
    VALUES (
      p_giveaway_id, v_pool.user_id, v_pool.entry_id, v_position, 'alternate',
      'selected', v_code,
      jsonb_build_object('draw_seed_hash', md5(v_draw_seed))
    )
    RETURNING id INTO v_winner_id;

    v_selected_users := array_append(v_selected_users, v_pool.user_id);
    v_alternate_count := v_alternate_count + 1;

    PERFORM public._giveaway_audit_log(
      p_giveaway_id, p_admin_id, 'winner_selected', 'winner', v_winner_id,
      NULL,
      jsonb_build_object('position', v_position, 'user_id', v_pool.user_id),
      jsonb_build_object('winner_type', 'alternate')
    );
  END LOOP;

  UPDATE public.community_giveaways
  SET status = 'drawn',
      drawn_at = now(),
      updated_at = now()
  WHERE id = p_giveaway_id;

  PERFORM public._giveaway_audit_log(
    p_giveaway_id, p_admin_id, 'drawn', 'giveaway', p_giveaway_id,
    jsonb_build_object('status', v_giveaway.status),
    jsonb_build_object(
      'status', 'drawn',
      'winners', v_winner_count,
      'alternates', v_alternate_count,
      'participants', v_total_participants,
      'chances', v_total_chances
    ),
    jsonb_build_object('draw_seed_hash', md5(v_draw_seed))
  );

  RETURN jsonb_build_object(
    'drawn', true,
    'winners', v_winner_count,
    'alternates', v_alternate_count,
    'participants', v_total_participants,
    'total_chances', v_total_chances,
    'draw_seed_hash', md5(v_draw_seed)
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- activate_community_giveaway_alternate
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.activate_community_giveaway_alternate(
  p_giveaway_id uuid,
  p_admin_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alternate public.community_giveaway_winners%ROWTYPE;
BEGIN
  IF NOT public.is_admin()
     AND COALESCE(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  SELECT * INTO v_alternate
  FROM public.community_giveaway_winners
  WHERE giveaway_id = p_giveaway_id
    AND winner_type = 'alternate'
    AND status = 'selected'
  ORDER BY position ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no hay suplentes disponibles';
  END IF;

  UPDATE public.community_giveaway_winners
  SET status = 'notified',
      notified_at = now()
  WHERE id = v_alternate.id;

  PERFORM public._giveaway_audit_log(
    p_giveaway_id, p_admin_id, 'alternate_activated', 'winner', v_alternate.id,
    jsonb_build_object('status', 'selected'),
    jsonb_build_object('status', 'notified'),
    '{}'::jsonb
  );

  RETURN v_alternate.id;
END;
$$;

-- -----------------------------------------------------------------------------
-- claim_community_giveaway_prize
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_community_giveaway_prize(
  p_winner_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner public.community_giveaway_winners%ROWTYPE;
  v_giveaway public.community_giveaways%ROWTYPE;
BEGIN
  IF p_winner_id IS NULL OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'parámetros inválidos';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id
     AND NOT public.is_admin()
     AND COALESCE(auth.jwt() ->> 'role', '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  SELECT * INTO v_winner
  FROM public.community_giveaway_winners
  WHERE id = p_winner_id
  FOR UPDATE;

  IF NOT FOUND OR v_winner.user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'premio no encontrado';
  END IF;

  SELECT * INTO v_giveaway
  FROM public.community_giveaways
  WHERE id = v_winner.giveaway_id;

  IF v_giveaway.status IS DISTINCT FROM 'drawn' THEN
    RAISE EXCEPTION 'el sorteo aún no fue realizado';
  END IF;

  IF v_giveaway.claim_deadline IS NOT NULL AND v_giveaway.claim_deadline < now() THEN
    RAISE EXCEPTION 'plazo de reclamo vencido';
  END IF;

  IF v_winner.status NOT IN ('selected', 'notified') THEN
    RAISE EXCEPTION 'el premio no puede reclamarse en este estado';
  END IF;

  UPDATE public.community_giveaway_winners
  SET status = 'claimed',
      claimed_at = now()
  WHERE id = p_winner_id;

  PERFORM public._giveaway_audit_log(
    v_winner.giveaway_id, p_user_id, 'prize_claimed', 'winner', p_winner_id,
    jsonb_build_object('status', v_winner.status),
    jsonb_build_object('status', 'claimed'),
    '{}'::jsonb
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- maintain_community_giveaways (cron idempotente)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.maintain_community_giveaways()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activated integer := 0;
  v_closed integer := 0;
  v_expired integer := 0;
BEGIN
  UPDATE public.community_giveaways
  SET status = 'active', updated_at = now()
  WHERE status = 'scheduled'
    AND (starts_at IS NULL OR starts_at <= now());

  GET DIAGNOSTICS v_activated = ROW_COUNT;

  UPDATE public.community_giveaways
  SET status = 'closed', updated_at = now()
  WHERE status = 'active'
    AND closes_at IS NOT NULL
    AND closes_at <= now();

  GET DIAGNOSTICS v_closed = ROW_COUNT;

  UPDATE public.community_giveaway_winners w
  SET status = 'expired',
      expired_at = now()
  FROM public.community_giveaways g
  WHERE w.giveaway_id = g.id
    AND g.claim_deadline IS NOT NULL
    AND g.claim_deadline < now()
    AND w.status IN ('selected', 'notified')
    AND w.winner_type = 'winner';

  GET DIAGNOSTICS v_expired = ROW_COUNT;

  RETURN jsonb_build_object(
    'activated', v_activated,
    'closed', v_closed,
    'expired_winners', v_expired
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- Grants / revokes
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public._giveaway_audit_log(uuid, uuid, text, text, uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._giveaway_level_bonus_quantity(jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._giveaway_validate_eligibility(public.community_giveaways, uuid, public.community_members) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.enter_community_giveaway(uuid, uuid, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enter_community_giveaway(uuid, uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.enter_community_giveaway(uuid, uuid, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.create_automatic_giveaway_entry(uuid, uuid, text, text, integer) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.cancel_community_giveaway(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.disqualify_community_giveaway_entry(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.draw_community_giveaway(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.activate_community_giveaway_alternate(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.maintain_community_giveaways() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.claim_community_giveaway_prize(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_community_giveaway_prize(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_community_giveaway_prize(uuid, uuid) TO authenticated;

ALTER FUNCTION public.enter_community_giveaway(uuid, uuid, integer, text) SET search_path = public;
ALTER FUNCTION public.create_automatic_giveaway_entry(uuid, uuid, text, text, integer) SET search_path = public;
ALTER FUNCTION public.cancel_community_giveaway(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.disqualify_community_giveaway_entry(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.draw_community_giveaway(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.activate_community_giveaway_alternate(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.claim_community_giveaway_prize(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.maintain_community_giveaways() SET search_path = public;
