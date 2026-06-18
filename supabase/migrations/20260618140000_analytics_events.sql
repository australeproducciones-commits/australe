-- =============================================================================
-- Australe Producciones · Analítica básica de visitas y conversiones
-- Tabla para métricas de tráfico público (sin datos personales sensibles).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  page_path text NOT NULL,
  event_id uuid REFERENCES public.events (id) ON DELETE SET NULL,
  ticket_type_id uuid REFERENCES public.ticket_types (id) ON DELETE SET NULL,
  session_id text NOT NULL,
  visitor_id text NOT NULL,
  referrer text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analytics_events_event_name_not_empty CHECK (btrim(event_name) <> ''),
  CONSTRAINT analytics_events_page_path_not_empty CHECK (btrim(page_path) <> ''),
  CONSTRAINT analytics_events_session_id_not_empty CHECK (btrim(session_id) <> ''),
  CONSTRAINT analytics_events_visitor_id_not_empty CHECK (btrim(visitor_id) <> '')
);

COMMENT ON TABLE public.analytics_events IS
  'Eventos de analítica anónimos: visitas, clics y conversiones del sitio público';

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created_at
  ON public.analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_id_created_at
  ON public.analytics_events (event_id, created_at DESC)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path_created_at
  ON public.analytics_events (page_path, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_events_insert_public ON public.analytics_events;
CREATE POLICY analytics_events_insert_public
  ON public.analytics_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS analytics_events_admin_select ON public.analytics_events;
CREATE POLICY analytics_events_admin_select
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
