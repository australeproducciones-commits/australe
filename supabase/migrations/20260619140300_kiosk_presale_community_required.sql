-- Preventa pública de consumiciones: solo miembros activos de la comunidad.

CREATE OR REPLACE FUNCTION public.trg_enforce_public_kiosk_presale_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source <> 'public' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_public_kiosk_order: usuario no autenticado';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.community_members cm
    WHERE cm.profile_id = auth.uid()
      AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'create_public_kiosk_order: comunidad requerida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_public_kiosk_presale_community ON public.kiosk_orders;

CREATE TRIGGER enforce_public_kiosk_presale_community
  BEFORE INSERT ON public.kiosk_orders
  FOR EACH ROW
  WHEN (NEW.source = 'public')
  EXECUTE FUNCTION public.trg_enforce_public_kiosk_presale_community();

COMMENT ON FUNCTION public.trg_enforce_public_kiosk_presale_community IS
  'Bloquea órdenes públicas de kiosco si el usuario no es miembro activo de la comunidad.';
