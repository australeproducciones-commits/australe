-- Restringir adjust_loyalty_points exclusivamente a service_role (servidor).
-- La app admin valida requireAdmin() antes de invocar vía createAdminClient().

REVOKE ALL ON FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) TO service_role;

ALTER FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) SET search_path = public;
