-- =============================================================================
-- Australe Producciones · Profile functions V1
-- Ejecutar manualmente en Supabase → SQL Editor.
-- Requiere haber ejecutado schema-v1.sql previamente.
-- No crea triggers en auth.users ni policies RLS.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Función: asegurar profile del usuario autenticado
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_profile(
  p_full_name text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile public.profiles;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ensure_profile: usuario no autenticado';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    whatsapp,
    role,
    is_active
  )
  VALUES (
    v_user_id,
    p_full_name,
    p_whatsapp,
    'customer',
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    whatsapp = COALESCE(profiles.whatsapp, EXCLUDED.whatsapp),
    updated_at = now()
  RETURNING * INTO v_profile;

  RETURN v_profile;
END;
$$;

COMMENT ON FUNCTION public.ensure_profile(text, text) IS
  'Crea o completa el perfil del usuario autenticado. No modifica role ni is_active si ya existe.';

-- -----------------------------------------------------------------------------
-- B) Permisos de ejecución (solo usuarios autenticados)
-- -----------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.ensure_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_profile(text, text) TO authenticated;
