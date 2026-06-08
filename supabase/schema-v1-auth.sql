-- =============================================================================
-- Australe Producciones · Auth V1
-- Ejecutar manualmente en Supabase → SQL Editor.
-- Requiere haber ejecutado schema-v1.sql previamente.
-- Crea perfil automático en public.profiles al registrarse en auth.users.
-- No incluye policies RLS ni datos de prueba.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- A) Función: crear profile al registrar usuario
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    whatsapp,
    role,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'whatsapp',
    'customer',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Crea un perfil en public.profiles cuando se inserta un usuario en auth.users';

-- -----------------------------------------------------------------------------
-- B) Trigger: ejecutar al crear usuario en auth
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
  'Dispara handle_new_user() para crear el perfil asociado al nuevo usuario';
