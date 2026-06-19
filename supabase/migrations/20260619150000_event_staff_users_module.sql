-- =============================================================================
-- Australe · Usuarios internos: event_staff, acceso por evento, auditoría
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS staff_all_events boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.staff_all_events IS
  'Si true, cajero/portero acceden a todos los eventos. Si false, solo event_staff.';

ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_id ON public.audit_logs (event_id);

-- -----------------------------------------------------------------------------
-- event_staff
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.event_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_staff_role_check CHECK (role IN ('cashier', 'door')),
  CONSTRAINT event_staff_unique UNIQUE (event_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_event_staff_user_id ON public.event_staff (user_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_event_id ON public.event_staff (event_id);
CREATE INDEX IF NOT EXISTS idx_event_staff_active ON public.event_staff (is_active);

CREATE TRIGGER set_event_staff_updated_at
  BEFORE UPDATE ON public.event_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Helpers de acceso por evento
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
      public.is_staff()
      AND COALESCE(
        (SELECT p.staff_all_events FROM public.profiles p WHERE p.id = auth.uid()),
        false
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.event_staff es
      WHERE es.event_id = p_event_id
        AND es.user_id = auth.uid()
        AND es.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.count_active_admins()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
  FROM public.profiles p
  WHERE p.role = 'admin'
    AND p.is_active = true;
$$;

-- -----------------------------------------------------------------------------
-- RLS event_staff
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS event_staff_admin_all ON public.event_staff;
DROP POLICY IF EXISTS event_staff_select_own ON public.event_staff;

CREATE POLICY event_staff_admin_all
  ON public.event_staff
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY event_staff_select_own
  ON public.event_staff
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Actualizar policies de events / ticket_types / tickets (scope por evento)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS events_select_staff ON public.events;

CREATE POLICY events_select_staff
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff()
    AND public.staff_has_event_access(id)
  );

DROP POLICY IF EXISTS ticket_types_select_staff ON public.ticket_types;

CREATE POLICY ticket_types_select_staff
  ON public.ticket_types
  FOR SELECT
  TO authenticated
  USING (
    (public.is_cashier() OR public.is_door())
    AND public.staff_has_event_access(event_id)
  );

DROP POLICY IF EXISTS tickets_cashier_select ON public.tickets;
DROP POLICY IF EXISTS tickets_cashier_insert ON public.tickets;
DROP POLICY IF EXISTS tickets_cashier_update ON public.tickets;
DROP POLICY IF EXISTS tickets_door_select ON public.tickets;
DROP POLICY IF EXISTS tickets_door_update_mark_used ON public.tickets;

CREATE POLICY tickets_cashier_select
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (public.is_cashier() AND public.staff_has_event_access(event_id));

CREATE POLICY tickets_cashier_insert
  ON public.tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_cashier() AND public.staff_has_event_access(event_id));

CREATE POLICY tickets_cashier_update
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (public.is_cashier() AND public.staff_has_event_access(event_id))
  WITH CHECK (public.is_cashier() AND public.staff_has_event_access(event_id));

CREATE POLICY tickets_door_select
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (public.is_door() AND public.staff_has_event_access(event_id));

CREATE POLICY tickets_door_update_mark_used
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (
    public.is_door()
    AND public.staff_has_event_access(event_id)
    AND ticket_status = 'valid'
  )
  WITH CHECK (
    public.is_door()
    AND public.staff_has_event_access(event_id)
    AND ticket_status = 'used'
    AND used_by = auth.uid()
    AND used_at IS NOT NULL
  );

COMMENT ON TABLE public.event_staff IS
  'Asignación de cajeros y porteros a eventos específicos.';
