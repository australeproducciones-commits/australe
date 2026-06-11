-- =============================================================================
-- Australe Producciones · Imagen principal unificada + destacados en home
-- Requiere: schema-v1.sql (events)
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS image_original_url text,
  ADD COLUMN IF NOT EXISTS image_focal_x integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS image_focal_y integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS featured_label text,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS homepage_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.events.image_original_url IS
  'Imagen principal del evento. La web recorta para banner, flyer y miniaturas.';

COMMENT ON COLUMN public.events.image_focal_x IS
  'Punto focal horizontal (0-100) para object-position.';

COMMENT ON COLUMN public.events.image_focal_y IS
  'Punto focal vertical (0-100) para object-position.';

COMMENT ON COLUMN public.events.featured_label IS
  'Texto corto opcional para promoción en home.';

COMMENT ON COLUMN public.events.featured_until IS
  'Fecha hasta la cual el evento se muestra como destacado en home.';

COMMENT ON COLUMN public.events.homepage_order IS
  'Orden manual en home (menor primero).';
