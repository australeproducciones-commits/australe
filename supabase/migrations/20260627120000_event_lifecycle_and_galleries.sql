-- =============================================================================
-- ETAPA J1: clasificación evento/promoción, fecha final, galerías por evento
-- Aditivo y retrocompatible. Sin DROP ni TRUNCATE de datos existentes.
-- =============================================================================

-- 1. Clasificación explícita
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS content_kind text NOT NULL DEFAULT 'event';

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_content_kind_check;

ALTER TABLE public.events
  ADD CONSTRAINT events_content_kind_check
  CHECK (content_kind IN ('event', 'promotion'));

UPDATE public.events
SET content_kind = 'event'
WHERE content_kind IS NULL OR content_kind NOT IN ('event', 'promotion');

-- 2. Fecha final opcional (eventos de varios días)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS event_end_date date;

-- Promociones pueden omitir fecha; eventos requieren fecha inicial
ALTER TABLE public.events
  ALTER COLUMN event_date DROP NOT NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_event_date_required_for_events;

ALTER TABLE public.events
  ADD CONSTRAINT events_event_date_required_for_events
  CHECK (content_kind = 'promotion' OR event_date IS NOT NULL);

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_end_date_after_start;

ALTER TABLE public.events
  ADD CONSTRAINT events_end_date_after_start
  CHECK (
    event_end_date IS NULL
    OR event_date IS NULL
    OR event_end_date >= event_date
  );

CREATE INDEX IF NOT EXISTS events_content_kind_status_idx
  ON public.events (content_kind, status, audience);

CREATE INDEX IF NOT EXISTS events_event_end_date_idx
  ON public.events (event_end_date)
  WHERE event_end_date IS NOT NULL;

COMMENT ON COLUMN public.events.content_kind IS
  'event = cartelera/entradas/galería; promotion = solo hero destacado sin fecha obligatoria.';

COMMENT ON COLUMN public.events.event_end_date IS
  'Último día del evento. NULL = un solo día (usa event_date).';

-- 3. Items de galería por evento
CREATE TABLE IF NOT EXISTS public.event_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  media_type text NOT NULL,
  media_url text NOT NULL,
  thumbnail_url text,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT event_gallery_items_media_type_check
    CHECK (media_type IN ('image', 'youtube', 'vimeo'))
);

CREATE INDEX IF NOT EXISTS event_gallery_items_event_sort_idx
  ON public.event_gallery_items (event_id, sort_order);

CREATE INDEX IF NOT EXISTS event_gallery_items_published_idx
  ON public.event_gallery_items (event_id, is_published, sort_order)
  WHERE is_published = true;

ALTER TABLE public.event_gallery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_gallery_items_public_read ON public.event_gallery_items;
CREATE POLICY event_gallery_items_public_read ON public.event_gallery_items
  FOR SELECT
  TO anon, authenticated
  USING (
    is_published = true
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_gallery_items.event_id
        AND e.status = 'published'
        AND e.audience = 'public'
        AND e.content_kind = 'event'
    )
  );

DROP POLICY IF EXISTS event_gallery_items_admin_all ON public.event_gallery_items;
CREATE POLICY event_gallery_items_admin_all ON public.event_gallery_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.event_gallery_items TO anon, authenticated;
GRANT ALL ON public.event_gallery_items TO authenticated;

-- 4. Bucket de imágenes de galería (solo fotos; videos son URLs externas)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-gallery',
  'event-gallery',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS event_gallery_storage_public_read ON storage.objects;
CREATE POLICY event_gallery_storage_public_read ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'event-gallery');

DROP POLICY IF EXISTS event_gallery_storage_admin_write ON storage.objects;
CREATE POLICY event_gallery_storage_admin_write ON storage.objects
  FOR ALL
  TO authenticated
  USING (bucket_id = 'event-gallery' AND public.is_admin())
  WITH CHECK (bucket_id = 'event-gallery' AND public.is_admin());
