-- =============================================================================
-- Módulo Comunidad / Fidelización (aditivo)
-- Tablas: community_settings, community_levels, loyalty_accounts,
--         loyalty_transactions, community_rewards, community_redemptions
-- Extiende community_members sin eliminar columnas ni datos.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. community_settings (singleton)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  community_enabled boolean NOT NULL DEFAULT true,
  ticket_points_enabled boolean NOT NULL DEFAULT true,
  consumption_points_enabled boolean NOT NULL DEFAULT false,
  amount_per_point numeric NOT NULL DEFAULT 1000 CHECK (amount_per_point > 0),
  welcome_points integer NOT NULL DEFAULT 0 CHECK (welcome_points >= 0),
  public_title text NOT NULL DEFAULT 'Comunidad Australe',
  public_description text NOT NULL DEFAULT 'Sumá puntos con tus compras y canjeá beneficios exclusivos.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.community_settings IS 'Configuración global del programa de fidelización (fila única id=1).';

INSERT INTO public.community_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. community_levels
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  minimum_lifetime_points integer NOT NULL CHECK (minimum_lifetime_points >= 0),
  description text,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.community_levels IS 'Niveles de fidelización según puntos históricos acumulados.';

-- -----------------------------------------------------------------------------
-- 3. loyalty_accounts
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  points_balance integer NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  lifetime_points integer NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  current_level_id uuid REFERENCES public.community_levels (id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.loyalty_accounts IS 'Cuenta de puntos por perfil (user_id = profiles.id).';

-- -----------------------------------------------------------------------------
-- 4. loyalty_transactions (libro contable inmutable)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  points integer NOT NULL,
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  source_type text NOT NULL,
  source_id text,
  idempotency_key text NOT NULL UNIQUE,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT loyalty_transactions_type_check CHECK (
    transaction_type IN ('earn', 'redeem', 'adjustment', 'reversal', 'expiration')
  )
);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_created
  ON public.loyalty_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_source
  ON public.loyalty_transactions (source_type, source_id);

COMMENT ON TABLE public.loyalty_transactions IS 'Movimientos de puntos inmutables; correcciones vía reversal o adjustment.';

-- -----------------------------------------------------------------------------
-- 5. community_rewards
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  points_cost integer NOT NULL CHECK (points_cost > 0),
  stock integer CHECK (stock IS NULL OR stock >= 0),
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  reward_type text NOT NULL DEFAULT 'benefit',
  reward_value jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  max_per_user integer CHECK (max_per_user IS NULL OR max_per_user > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.community_rewards IS 'Recompensas canjeables del programa de fidelización.';

-- -----------------------------------------------------------------------------
-- 6. community_redemptions
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.community_rewards (id) ON DELETE RESTRICT,
  points_spent integer NOT NULL CHECK (points_spent > 0),
  redemption_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  redeemed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_redemptions_status_check CHECK (
    status IN ('pending', 'approved', 'used', 'cancelled', 'expired')
  )
);

CREATE INDEX IF NOT EXISTS idx_community_redemptions_user
  ON public.community_redemptions (user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 7. Extensión aditiva de community_members
-- -----------------------------------------------------------------------------

ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

ALTER TABLE public.community_members
  ADD COLUMN IF NOT EXISTS suspension_reason text;

ALTER TABLE public.community_members
  DROP CONSTRAINT IF EXISTS community_members_status_check;

ALTER TABLE public.community_members
  ADD CONSTRAINT community_members_status_check CHECK (
    status IN ('active', 'inactive', 'blocked', 'pending', 'suspended', 'disabled')
  );

-- -----------------------------------------------------------------------------
-- 8. Niveles iniciales
-- -----------------------------------------------------------------------------

INSERT INTO public.community_levels (name, minimum_lifetime_points, description, benefits, sort_order, is_active)
SELECT v.name, v.minimum_lifetime_points, v.description, v.benefits::jsonb, v.sort_order, true
FROM (
  VALUES
    ('Comunidad', 0, 'Nivel inicial del programa.', '["Acceso al programa de puntos"]', 1),
    ('Fan', 500, 'Para quienes ya sumaron experiencias con Australe.', '["Beneficios Fan"]', 2),
    ('Estrella', 1500, 'Reconocimiento por tu fidelidad.', '["Beneficios Estrella"]', 3),
    ('Experiencia VIP', 5000, 'El nivel más alto de la comunidad.', '["Beneficios VIP"]', 4)
) AS v(name, minimum_lifetime_points, description, benefits, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.community_levels LIMIT 1);

-- -----------------------------------------------------------------------------
-- 9. Funciones helper internas
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_loyalty_account(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.community_settings%ROWTYPE;
  v_welcome integer;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id requerido';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'perfil no encontrado';
  END IF;

  INSERT INTO public.loyalty_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_settings FROM public.community_settings WHERE id = 1;

  IF v_settings.welcome_points > 0
     AND COALESCE(v_settings.community_enabled, false) THEN
    PERFORM public.award_loyalty_points(
      p_user_id,
      v_settings.welcome_points,
      'welcome',
      p_user_id::text,
      'welcome:' || p_user_id::text,
      'Puntos de bienvenida',
      '{}'::jsonb,
      NULL
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_loyalty_level(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lifetime integer;
  v_level_id uuid;
BEGIN
  SELECT lifetime_points INTO v_lifetime
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id;

  IF v_lifetime IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT cl.id INTO v_level_id
  FROM public.community_levels cl
  WHERE cl.is_active = true
    AND cl.minimum_lifetime_points <= v_lifetime
  ORDER BY cl.minimum_lifetime_points DESC, cl.sort_order DESC
  LIMIT 1;

  UPDATE public.loyalty_accounts
  SET current_level_id = v_level_id,
      updated_at = now()
  WHERE user_id = p_user_id;

  RETURN v_level_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 10. Acreditación de puntos
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_source_type text,
  p_source_id text,
  p_idempotency_key text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_settings public.community_settings%ROWTYPE;
  v_balance integer;
  v_lifetime integer;
  v_new_balance integer;
  v_new_lifetime integer;
  v_tx_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'parámetros inválidos para acreditación';
  END IF;

  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key requerido';
  END IF;

  SELECT id INTO v_existing
  FROM public.loyalty_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_settings FROM public.community_settings WHERE id = 1;

  IF NOT COALESCE(v_settings.community_enabled, false) THEN
    RAISE EXCEPTION 'programa de comunidad deshabilitado';
  END IF;

  INSERT INTO public.loyalty_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT points_balance, lifetime_points
  INTO v_balance, v_lifetime
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  v_new_balance := v_balance + p_points;
  v_new_lifetime := v_lifetime + p_points;

  UPDATE public.loyalty_accounts
  SET points_balance = v_new_balance,
      lifetime_points = v_new_lifetime,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.loyalty_transactions (
    user_id, transaction_type, points, balance_after,
    source_type, source_id, idempotency_key, description, metadata, created_by
  )
  VALUES (
    p_user_id, 'earn', p_points, v_new_balance,
    p_source_type, p_source_id, p_idempotency_key, p_description, p_metadata, p_created_by
  )
  RETURNING id INTO v_tx_id;

  PERFORM public.recalculate_loyalty_level(p_user_id);

  RETURN v_tx_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 11. Reverso de puntos
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reverse_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_source_type text,
  p_source_id text,
  p_idempotency_key text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
  v_balance integer;
  v_lifetime integer;
  v_deduct integer;
  v_new_balance integer;
  v_new_lifetime integer;
  v_tx_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_points IS NULL OR p_points <= 0 THEN
    RAISE EXCEPTION 'parámetros inválidos para reverso';
  END IF;

  SELECT id INTO v_existing
  FROM public.loyalty_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT points_balance, lifetime_points
  INTO v_balance, v_lifetime
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'cuenta de puntos no encontrada';
  END IF;

  v_deduct := LEAST(p_points, v_balance);
  v_new_balance := v_balance - v_deduct;
  v_new_lifetime := GREATEST(0, v_lifetime - p_points);

  UPDATE public.loyalty_accounts
  SET points_balance = v_new_balance,
      lifetime_points = v_new_lifetime,
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO public.loyalty_transactions (
    user_id, transaction_type, points, balance_after,
    source_type, source_id, idempotency_key, description, metadata, created_by
  )
  VALUES (
    p_user_id, 'reversal', -p_points, v_new_balance,
    p_source_type, p_source_id, p_idempotency_key, p_description, p_metadata, p_created_by
  )
  RETURNING id INTO v_tx_id;

  PERFORM public.recalculate_loyalty_level(p_user_id);

  RETURN v_tx_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. Ajuste manual (admin)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.adjust_loyalty_points(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_admin_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_lifetime integer;
  v_new_balance integer;
  v_new_lifetime integer;
  v_tx_id uuid;
  v_key text;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  IF p_user_id IS NULL OR p_points IS NULL OR p_points = 0 THEN
    RAISE EXCEPTION 'cantidad inválida';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'motivo requerido';
  END IF;

  INSERT INTO public.loyalty_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT points_balance, lifetime_points
  INTO v_balance, v_lifetime
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF p_points > 0 THEN
    v_new_balance := v_balance + p_points;
    v_new_lifetime := v_lifetime + p_points;
  ELSE
    v_new_balance := GREATEST(0, v_balance + p_points);
    v_new_lifetime := GREATEST(0, v_lifetime + p_points);
  END IF;

  UPDATE public.loyalty_accounts
  SET points_balance = v_new_balance,
      lifetime_points = v_new_lifetime,
      updated_at = now()
  WHERE user_id = p_user_id;

  v_key := 'adjustment:' || p_user_id::text || ':' || gen_random_uuid()::text;

  INSERT INTO public.loyalty_transactions (
    user_id, transaction_type, points, balance_after,
    source_type, source_id, idempotency_key, description, metadata, created_by
  )
  VALUES (
    p_user_id, 'adjustment', p_points, v_new_balance,
    'admin_adjustment', NULL, v_key, p_reason,
    jsonb_build_object('admin_id', p_admin_id), p_admin_id
  )
  RETURNING id INTO v_tx_id;

  PERFORM public.recalculate_loyalty_level(p_user_id);

  RETURN v_tx_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 13. Canje de recompensa
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.redeem_community_reward(
  p_user_id uuid,
  p_reward_id uuid
)
RETURNS TABLE (
  redemption_id uuid,
  redemption_code text,
  points_spent integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reward public.community_rewards%ROWTYPE;
  v_settings public.community_settings%ROWTYPE;
  v_balance integer;
  v_user_count integer;
  v_new_balance integer;
  v_code text;
  v_redemption_id uuid;
  v_tx_id uuid;
  v_key text;
BEGIN
  IF p_user_id IS NULL OR p_reward_id IS NULL THEN
    RAISE EXCEPTION 'parámetros inválidos';
  END IF;

  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'no autorizado';
  END IF;

  SELECT * INTO v_settings FROM public.community_settings WHERE id = 1;

  IF NOT COALESCE(v_settings.community_enabled, false) THEN
    RAISE EXCEPTION 'programa deshabilitado';
  END IF;

  SELECT * INTO v_reward
  FROM public.community_rewards
  WHERE id = p_reward_id
  FOR UPDATE;

  IF NOT FOUND OR v_reward.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'recompensa no disponible';
  END IF;

  IF v_reward.starts_at IS NOT NULL AND v_reward.starts_at > now() THEN
    RAISE EXCEPTION 'recompensa aún no disponible';
  END IF;

  IF v_reward.ends_at IS NOT NULL AND v_reward.ends_at < now() THEN
    RAISE EXCEPTION 'recompensa expirada';
  END IF;

  IF v_reward.stock IS NOT NULL AND v_reward.stock <= 0 THEN
    RAISE EXCEPTION 'recompensa agotada';
  END IF;

  IF v_reward.max_per_user IS NOT NULL THEN
    SELECT count(*)::integer INTO v_user_count
    FROM public.community_redemptions cr
    WHERE cr.user_id = p_user_id
      AND cr.reward_id = p_reward_id
      AND cr.status NOT IN ('cancelled', 'expired');

    IF v_user_count >= v_reward.max_per_user THEN
      RAISE EXCEPTION 'límite de canjes alcanzado';
    END IF;
  END IF;

  INSERT INTO public.loyalty_accounts (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT points_balance INTO v_balance
  FROM public.loyalty_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_reward.points_cost THEN
    RAISE EXCEPTION 'saldo insuficiente';
  END IF;

  v_new_balance := v_balance - v_reward.points_cost;

  UPDATE public.loyalty_accounts
  SET points_balance = v_new_balance,
      updated_at = now()
  WHERE user_id = p_user_id;

  v_key := 'redeem:' || p_user_id::text || ':' || p_reward_id::text || ':' || gen_random_uuid()::text;

  INSERT INTO public.loyalty_transactions (
    user_id, transaction_type, points, balance_after,
    source_type, source_id, idempotency_key, description, metadata
  )
  VALUES (
    p_user_id, 'redeem', -v_reward.points_cost, v_new_balance,
    'reward', p_reward_id::text, v_key,
    'Canje: ' || v_reward.name,
    jsonb_build_object('reward_id', p_reward_id)
  )
  RETURNING id INTO v_tx_id;

  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  INSERT INTO public.community_redemptions (
    user_id, reward_id, points_spent, redemption_code, status
  )
  VALUES (
    p_user_id, p_reward_id, v_reward.points_cost, 'AR-' || v_code, 'approved'
  )
  RETURNING id INTO v_redemption_id;

  redemption_id := v_redemption_id;
  redemption_code := 'AR-' || v_code;
  points_spent := v_reward.points_cost;

  IF v_reward.stock IS NOT NULL THEN
    UPDATE public.community_rewards
    SET stock = stock - 1,
        updated_at = now()
    WHERE id = p_reward_id;
  END IF;

  RETURN NEXT;
END;
$$;

-- -----------------------------------------------------------------------------
-- 14. Acreditación por ticket confirmado (servidor)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_loyalty_points_for_ticket(p_ticket_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_settings public.community_settings%ROWTYPE;
  v_points integer;
  v_key text;
BEGIN
  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'entrada no encontrada';
  END IF;

  IF v_ticket.user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_ticket.payment_status <> 'confirmed' THEN
    RETURN NULL;
  END IF;

  IF v_ticket.ticket_status IN ('cancelled', 'expired') THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_settings FROM public.community_settings WHERE id = 1;

  IF NOT COALESCE(v_settings.community_enabled, false)
     OR NOT COALESCE(v_settings.ticket_points_enabled, false) THEN
    RETURN NULL;
  END IF;

  v_points := floor(v_ticket.price_paid / v_settings.amount_per_point)::integer;

  IF v_points <= 0 THEN
    RETURN NULL;
  END IF;

  v_key := 'ticket:' || p_ticket_id::text || ':earn';

  RETURN public.award_loyalty_points(
    v_ticket.user_id,
    v_points,
    'ticket',
    p_ticket_id::text,
    v_key,
    'Puntos por compra de entrada',
    jsonb_build_object('ticket_id', p_ticket_id, 'price_paid', v_ticket.price_paid),
    NULL
  );
END;
$$;

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
BEGIN
  SELECT * INTO v_ticket
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND OR v_ticket.user_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_key := 'ticket:' || p_ticket_id::text || ':earn';

  SELECT * INTO v_original
  FROM public.loyalty_transactions
  WHERE idempotency_key = v_key
    AND transaction_type = 'earn';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN public.reverse_loyalty_points(
    v_ticket.user_id,
    v_original.points,
    'ticket',
    p_ticket_id::text,
    'ticket:' || p_ticket_id::text || ':reversal',
    'Reverso por cancelación de entrada',
    jsonb_build_object('ticket_id', p_ticket_id),
    NULL
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 15. Triggers updated_at
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_community_settings_updated_at ON public.community_settings;
CREATE TRIGGER set_community_settings_updated_at
  BEFORE UPDATE ON public.community_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_community_levels_updated_at ON public.community_levels;
CREATE TRIGGER set_community_levels_updated_at
  BEFORE UPDATE ON public.community_levels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_community_rewards_updated_at ON public.community_rewards;
CREATE TRIGGER set_community_rewards_updated_at
  BEFORE UPDATE ON public.community_rewards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_community_redemptions_updated_at ON public.community_redemptions;
CREATE TRIGGER set_community_redemptions_updated_at
  BEFORE UPDATE ON public.community_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 16. RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_settings_public_read ON public.community_settings;
CREATE POLICY community_settings_public_read
  ON public.community_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS community_settings_admin_write ON public.community_settings;
CREATE POLICY community_settings_admin_write
  ON public.community_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS community_levels_public_read ON public.community_levels;
CREATE POLICY community_levels_public_read
  ON public.community_levels FOR SELECT
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS community_levels_admin_write ON public.community_levels;
CREATE POLICY community_levels_admin_write
  ON public.community_levels FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS loyalty_accounts_select_own ON public.loyalty_accounts;
CREATE POLICY loyalty_accounts_select_own
  ON public.loyalty_accounts FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS loyalty_accounts_admin_all ON public.loyalty_accounts;
CREATE POLICY loyalty_accounts_admin_all
  ON public.loyalty_accounts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS loyalty_transactions_select_own ON public.loyalty_transactions;
CREATE POLICY loyalty_transactions_select_own
  ON public.loyalty_transactions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS community_rewards_public_active ON public.community_rewards;
CREATE POLICY community_rewards_public_active
  ON public.community_rewards FOR SELECT
  USING (
    (is_active = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now()))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS community_rewards_admin_write ON public.community_rewards;
CREATE POLICY community_rewards_admin_write
  ON public.community_rewards FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS community_redemptions_select_own ON public.community_redemptions;
CREATE POLICY community_redemptions_select_own
  ON public.community_redemptions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS community_redemptions_admin_write ON public.community_redemptions;
CREATE POLICY community_redemptions_admin_write
  ON public.community_redemptions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Sin INSERT/UPDATE directo en loyalty_transactions para usuarios (solo RPC SECURITY DEFINER)

-- -----------------------------------------------------------------------------
-- 17. Grants
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.community_settings TO anon, authenticated;
GRANT SELECT ON public.community_levels TO anon, authenticated;
GRANT SELECT ON public.loyalty_accounts TO authenticated;
GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT SELECT ON public.community_rewards TO anon, authenticated;
GRANT SELECT ON public.community_redemptions TO authenticated;

GRANT ALL ON public.community_settings TO authenticated;
GRANT ALL ON public.community_levels TO authenticated;
GRANT ALL ON public.loyalty_accounts TO authenticated;
GRANT ALL ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.community_rewards TO authenticated;
GRANT ALL ON public.community_redemptions TO authenticated;

GRANT EXECUTE ON FUNCTION public.ensure_loyalty_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_loyalty_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_points(uuid, integer, text, text, text, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_loyalty_points(uuid, integer, text, text, text, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_community_reward(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_points_for_ticket(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_loyalty_points_for_ticket(uuid) TO authenticated;
