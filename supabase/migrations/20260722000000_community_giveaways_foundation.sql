-- =============================================================================
-- Módulo Sorteos de Comunidad (aditivo)
-- Tablas: community_giveaways, community_giveaway_entries,
--         community_giveaway_winners, community_giveaway_audit_logs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. community_giveaways
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_giveaways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description text,
  prize_description text NOT NULL,
  image_url text,
  terms_and_conditions text,
  status text NOT NULL DEFAULT 'draft',
  entry_type text NOT NULL DEFAULT 'free',
  points_cost integer NOT NULL DEFAULT 0 CHECK (points_cost >= 0),
  max_entries_per_user integer CHECK (max_entries_per_user IS NULL OR max_entries_per_user > 0),
  allow_multiple_entries boolean NOT NULL DEFAULT false,
  winner_count integer NOT NULL DEFAULT 1 CHECK (winner_count > 0),
  alternate_count integer NOT NULL DEFAULT 0 CHECK (alternate_count >= 0),
  starts_at timestamptz,
  closes_at timestamptz,
  draw_at timestamptz,
  claim_deadline timestamptz,
  related_event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  requires_valid_ticket boolean NOT NULL DEFAULT false,
  requires_used_ticket boolean NOT NULL DEFAULT false,
  minimum_purchase_amount numeric CHECK (minimum_purchase_amount IS NULL OR minimum_purchase_amount >= 0),
  minimum_community_level uuid REFERENCES public.community_levels (id) ON DELETE SET NULL,
  level_bonus_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public boolean NOT NULL DEFAULT true,
  allow_duplicate_winners boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  drawn_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT community_giveaways_status_check CHECK (
    status IN ('draft', 'scheduled', 'active', 'closed', 'drawn', 'cancelled')
  ),
  CONSTRAINT community_giveaways_entry_type_check CHECK (
    entry_type IN ('free', 'points', 'ticket', 'attendance', 'store_purchase', 'automatic', 'mixed')
  ),
  CONSTRAINT community_giveaways_dates_check CHECK (
    starts_at IS NULL OR closes_at IS NULL OR starts_at <= closes_at
  ),
  CONSTRAINT community_giveaways_draw_after_close_check CHECK (
    closes_at IS NULL OR draw_at IS NULL OR closes_at <= draw_at
  ),
  CONSTRAINT community_giveaways_points_entry_check CHECK (
    entry_type NOT IN ('points', 'mixed') OR points_cost > 0
  )
);

CREATE INDEX IF NOT EXISTS idx_community_giveaways_status
  ON public.community_giveaways (status);

CREATE INDEX IF NOT EXISTS idx_community_giveaways_slug
  ON public.community_giveaways (slug);

CREATE INDEX IF NOT EXISTS idx_community_giveaways_starts_at
  ON public.community_giveaways (starts_at);

CREATE INDEX IF NOT EXISTS idx_community_giveaways_closes_at
  ON public.community_giveaways (closes_at);

CREATE INDEX IF NOT EXISTS idx_community_giveaways_related_event
  ON public.community_giveaways (related_event_id)
  WHERE related_event_id IS NOT NULL;

COMMENT ON TABLE public.community_giveaways IS 'Sorteos exclusivos para miembros de Comunidad Australe.';

-- -----------------------------------------------------------------------------
-- 2. community_giveaway_entries
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_giveaway_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id uuid NOT NULL REFERENCES public.community_giveaways (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  community_member_id uuid REFERENCES public.community_members (id) ON DELETE SET NULL,
  entry_quantity integer NOT NULL CHECK (entry_quantity > 0),
  source_type text NOT NULL,
  source_reference_id text,
  points_transaction_id uuid REFERENCES public.loyalty_transactions (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  disqualified_at timestamptz,
  refunded_at timestamptz,
  CONSTRAINT community_giveaway_entries_status_check CHECK (
    status IN ('active', 'cancelled', 'disqualified', 'refunded')
  )
);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_entries_giveaway
  ON public.community_giveaway_entries (giveaway_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_entries_user
  ON public.community_giveaway_entries (user_id, giveaway_id);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_entries_status
  ON public.community_giveaway_entries (giveaway_id, status);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_entries_source
  ON public.community_giveaway_entries (giveaway_id, source_type, source_reference_id)
  WHERE source_reference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_community_giveaway_entries_auto_source_unique
  ON public.community_giveaway_entries (giveaway_id, source_type, source_reference_id)
  WHERE source_reference_id IS NOT NULL
    AND source_type IN ('ticket', 'attendance', 'store_purchase', 'automatic');

COMMENT ON TABLE public.community_giveaway_entries IS 'Participaciones en sorteos de comunidad.';

-- -----------------------------------------------------------------------------
-- 3. community_giveaway_winners
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_giveaway_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id uuid NOT NULL REFERENCES public.community_giveaways (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.community_giveaway_entries (id) ON DELETE SET NULL,
  position integer NOT NULL CHECK (position > 0),
  winner_type text NOT NULL,
  status text NOT NULL DEFAULT 'selected',
  selected_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  claimed_at timestamptz,
  expired_at timestamptz,
  replaced_by_winner_id uuid REFERENCES public.community_giveaway_winners (id) ON DELETE SET NULL,
  verification_code text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT community_giveaway_winners_type_check CHECK (
    winner_type IN ('winner', 'alternate')
  ),
  CONSTRAINT community_giveaway_winners_status_check CHECK (
    status IN ('selected', 'notified', 'claimed', 'expired', 'rejected', 'replaced')
  ),
  CONSTRAINT community_giveaway_winners_position_unique UNIQUE (giveaway_id, winner_type, position)
);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_winners_giveaway
  ON public.community_giveaway_winners (giveaway_id, winner_type, position);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_winners_user
  ON public.community_giveaway_winners (user_id, giveaway_id);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_winners_status
  ON public.community_giveaway_winners (giveaway_id, status);

COMMENT ON TABLE public.community_giveaway_winners IS 'Ganadores y suplentes de sorteos de comunidad.';

-- -----------------------------------------------------------------------------
-- 4. community_giveaway_audit_logs (inmutable)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_giveaway_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id uuid NOT NULL REFERENCES public.community_giveaways (id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  previous_data jsonb,
  new_data jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_audit_giveaway
  ON public.community_giveaway_audit_logs (giveaway_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_giveaway_audit_action
  ON public.community_giveaway_audit_logs (action, created_at DESC);

COMMENT ON TABLE public.community_giveaway_audit_logs IS 'Auditoría inmutable de sorteos de comunidad.';

-- -----------------------------------------------------------------------------
-- 5. Triggers updated_at
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS set_community_giveaways_updated_at ON public.community_giveaways;
CREATE TRIGGER set_community_giveaways_updated_at
  BEFORE UPDATE ON public.community_giveaways
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.community_giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_giveaway_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_giveaway_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_giveaway_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_giveaways_public_read ON public.community_giveaways;
CREATE POLICY community_giveaways_public_read
  ON public.community_giveaways FOR SELECT
  USING (
    public.is_admin()
    OR (
      is_public = true
      AND status IN ('scheduled', 'active', 'closed', 'drawn')
    )
  );

DROP POLICY IF EXISTS community_giveaways_admin_write ON public.community_giveaways;
CREATE POLICY community_giveaways_admin_write
  ON public.community_giveaways FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS community_giveaway_entries_select_own ON public.community_giveaway_entries;
CREATE POLICY community_giveaway_entries_select_own
  ON public.community_giveaway_entries FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS community_giveaway_entries_admin_write ON public.community_giveaway_entries;
CREATE POLICY community_giveaway_entries_admin_write
  ON public.community_giveaway_entries FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS community_giveaway_winners_public_drawn ON public.community_giveaway_winners;
CREATE POLICY community_giveaway_winners_public_drawn
  ON public.community_giveaway_winners FOR SELECT
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.community_giveaways g
      WHERE g.id = giveaway_id
        AND g.status = 'drawn'
        AND g.is_public = true
    )
  );

DROP POLICY IF EXISTS community_giveaway_winners_admin_write ON public.community_giveaway_winners;
CREATE POLICY community_giveaway_winners_admin_write
  ON public.community_giveaway_winners FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS community_giveaway_audit_admin_read ON public.community_giveaway_audit_logs;
CREATE POLICY community_giveaway_audit_admin_read
  ON public.community_giveaway_audit_logs FOR SELECT
  USING (public.is_admin());

-- Sin INSERT/UPDATE/DELETE directo en audit_logs para clientes

-- -----------------------------------------------------------------------------
-- 7. Grants
-- -----------------------------------------------------------------------------

GRANT SELECT ON public.community_giveaways TO anon, authenticated;
GRANT SELECT ON public.community_giveaway_entries TO authenticated;
GRANT SELECT ON public.community_giveaway_winners TO anon, authenticated;
GRANT SELECT ON public.community_giveaway_audit_logs TO authenticated;

GRANT ALL ON public.community_giveaways TO authenticated;
GRANT ALL ON public.community_giveaway_entries TO authenticated;
GRANT ALL ON public.community_giveaway_winners TO authenticated;
