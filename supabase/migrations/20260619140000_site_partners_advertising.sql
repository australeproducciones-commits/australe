-- =============================================================================
-- Australe · Configuración del sitio, partners y publicidad post-login
-- =============================================================================

-- Configuración global del sitio (singleton)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  contact_email text,
  contact_phone text,
  contact_whatsapp text,
  contact_location text,
  instagram_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

INSERT INTO public.site_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Partners / sponsors
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text NOT NULL,
  destination_url text,
  label text,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  open_in_new_tab boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partners_active_sort_idx
  ON public.partners (is_active, sort_order, created_at);

-- Frecuencia de publicidad post-login
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'advertising_frequency') THEN
    CREATE TYPE public.advertising_frequency AS ENUM (
      'once_per_session',
      'once_per_user',
      'once_per_campaign',
      'always_after_login'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.advertising_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_name text NOT NULL,
  title text,
  body text,
  image_url text,
  button_label text,
  destination_url text,
  is_active boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  priority integer NOT NULL DEFAULT 0,
  frequency public.advertising_frequency NOT NULL DEFAULT 'once_per_campaign',
  open_in_new_tab boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  dismiss_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS advertising_campaigns_active_priority_idx
  ON public.advertising_campaigns (is_active, priority DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.advertising_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.advertising_campaigns (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  clicked_at timestamptz,
  dismissed_at timestamptz,
  CONSTRAINT advertising_impressions_campaign_user_unique UNIQUE (campaign_id, user_id)
);

CREATE INDEX IF NOT EXISTS advertising_impressions_user_idx
  ON public.advertising_impressions (user_id, viewed_at DESC);

-- Helpers de vigencia
CREATE OR REPLACE FUNCTION public.is_content_active(
  p_is_active boolean,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    p_is_active
    AND (p_starts_at IS NULL OR p_starts_at <= now())
    AND (p_ends_at IS NULL OR p_ends_at > now());
$$;

-- RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertising_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertising_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS site_settings_public_read ON public.site_settings;
CREATE POLICY site_settings_public_read
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS site_settings_admin_write ON public.site_settings;
CREATE POLICY site_settings_admin_write
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS partners_public_read ON public.partners;
CREATE POLICY partners_public_read
  ON public.partners
  FOR SELECT
  TO anon, authenticated
  USING (public.is_content_active(is_active, starts_at, ends_at));

DROP POLICY IF EXISTS partners_admin_write ON public.partners;
CREATE POLICY partners_admin_write
  ON public.partners
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS advertising_campaigns_public_read ON public.advertising_campaigns;
CREATE POLICY advertising_campaigns_public_read
  ON public.advertising_campaigns
  FOR SELECT
  TO authenticated
  USING (public.is_content_active(is_active, starts_at, ends_at));

DROP POLICY IF EXISTS advertising_campaigns_admin_write ON public.advertising_campaigns;
CREATE POLICY advertising_campaigns_admin_write
  ON public.advertising_campaigns
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS advertising_impressions_own ON public.advertising_impressions;
CREATE POLICY advertising_impressions_own
  ON public.advertising_impressions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS advertising_impressions_admin_read ON public.advertising_impressions;
CREATE POLICY advertising_impressions_admin_read
  ON public.advertising_impressions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT SELECT ON public.partners TO anon, authenticated;
GRANT SELECT ON public.advertising_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.advertising_impressions TO authenticated;

-- Incrementos de analytics (partners y publicidad)
CREATE OR REPLACE FUNCTION public.increment_partner_view_count(p_partner_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.partners
  SET view_count = view_count + 1
  WHERE id = p_partner_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_partner_click_count(p_partner_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.partners
  SET click_count = click_count + 1
  WHERE id = p_partner_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_advertising_view_count(p_campaign_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.advertising_campaigns
  SET view_count = view_count + 1
  WHERE id = p_campaign_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_advertising_click_count(p_campaign_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.advertising_campaigns
  SET click_count = click_count + 1
  WHERE id = p_campaign_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_advertising_dismiss_count(p_campaign_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.advertising_campaigns
  SET dismiss_count = dismiss_count + 1
  WHERE id = p_campaign_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_partner_view_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_partner_click_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_advertising_view_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_advertising_click_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_advertising_dismiss_count(uuid) TO authenticated;
