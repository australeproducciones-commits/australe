-- =============================================================================
-- Australe · Streaming por evento (Etapa 1 — gratuito, aditivo)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  title text,
  subtitle text,
  is_enabled boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  provider text NOT NULL DEFAULT 'youtube',
  stream_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  access_type text NOT NULL DEFAULT 'free',
  stream_banner_url text,
  stream_banner_mobile_url text,
  home_featured boolean NOT NULL DEFAULT false,
  home_order integer NOT NULL DEFAULT 0,
  show_on_streaming_page boolean NOT NULL DEFAULT true,
  show_on_event_page boolean NOT NULL DEFAULT true,
  button_label text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_streams_status_check CHECK (
    status IN ('draft', 'scheduled', 'live', 'ended', 'paused')
  ),
  CONSTRAINT event_streams_provider_check CHECK (
    provider IN ('youtube', 'vimeo', 'hls', 'other')
  ),
  CONSTRAINT event_streams_access_type_check CHECK (
    access_type IN ('free')
  )
);

CREATE INDEX IF NOT EXISTS event_streams_event_id_idx
  ON public.event_streams (event_id);

CREATE INDEX IF NOT EXISTS event_streams_status_idx
  ON public.event_streams (status);

CREATE INDEX IF NOT EXISTS event_streams_starts_at_idx
  ON public.event_streams (starts_at);

CREATE INDEX IF NOT EXISTS event_streams_home_featured_idx
  ON public.event_streams (home_featured, home_order);

CREATE INDEX IF NOT EXISTS event_streams_is_enabled_idx
  ON public.event_streams (is_enabled);

COMMENT ON TABLE public.event_streams IS
  'Transmisiones en vivo asociadas a eventos. Etapa 1: acceso gratuito.';

-- updated_at (reutiliza función existente del proyecto)
DROP TRIGGER IF EXISTS event_streams_set_updated_at ON public.event_streams;
CREATE TRIGGER event_streams_set_updated_at
  BEFORE UPDATE ON public.event_streams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.event_streams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_streams_public_read ON public.event_streams;
CREATE POLICY event_streams_public_read
  ON public.event_streams
  FOR SELECT
  TO anon, authenticated
  USING (
    is_enabled = true
    AND status <> 'draft'
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_streams.event_id
        AND e.status = 'published'
    )
  );

DROP POLICY IF EXISTS event_streams_admin_write ON public.event_streams;
CREATE POLICY event_streams_admin_write
  ON public.event_streams
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.event_streams TO anon, authenticated;
