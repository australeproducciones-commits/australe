-- Configuración del Hero público de la tienda (singleton, aditiva).

CREATE TABLE IF NOT EXISTS public.store_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  hero_enabled boolean NOT NULL DEFAULT true,
  hero_eyebrow text,
  hero_title text,
  hero_description text,
  hero_desktop_image_url text,
  hero_mobile_image_url text,
  hero_desktop_image_alt text,
  hero_mobile_image_alt text,
  hero_primary_button_label text,
  hero_primary_button_url text,
  hero_secondary_button_label text,
  hero_secondary_button_url text,
  hero_badge_enabled boolean NOT NULL DEFAULT true,
  hero_badge_text text,
  hero_footer_text text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

INSERT INTO public.store_settings (
  id,
  hero_enabled,
  hero_eyebrow,
  hero_title,
  hero_description,
  hero_primary_button_label,
  hero_primary_button_url,
  hero_secondary_button_label,
  hero_secondary_button_url,
  hero_badge_enabled,
  hero_badge_text,
  hero_footer_text
)
VALUES (
  1,
  true,
  'TIENDA OFICIAL',
  'Llevá Australe con vos',
  'Merchandising oficial para quienes no solo viven el evento, sino que forman parte de él.',
  'Ver la colección',
  '/tienda#catalogo',
  'Explorar novedades',
  '/tienda#destacados',
  true,
  'MERCH OFICIAL',
  'Diseños oficiales · Ediciones limitadas · Comunidad Australe'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS store_settings_public_read ON public.store_settings;
CREATE POLICY store_settings_public_read
  ON public.store_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS store_settings_admin_write ON public.store_settings;
CREATE POLICY store_settings_admin_write
  ON public.store_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT ALL ON public.store_settings TO authenticated;
