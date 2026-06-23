-- Revocar EXECUTE público de adjust_loyalty_points (solo authenticated + service_role).
REVOKE EXECUTE ON FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) FROM PUBLIC, anon;
