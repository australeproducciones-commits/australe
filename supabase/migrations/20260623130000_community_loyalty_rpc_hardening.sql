-- Endurecer permisos RPC: acreditación/reverso solo vía service_role (servidor).
-- redeem_community_reward y adjust_loyalty_points mantienen EXECUTE para authenticated
-- (con validación interna de identidad / is_admin).

REVOKE EXECUTE ON FUNCTION public.ensure_loyalty_account(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalculate_loyalty_level(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(uuid, integer, text, text, text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reverse_loyalty_points(uuid, integer, text, text, text, text, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_loyalty_points_for_ticket(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reverse_loyalty_points_for_ticket(uuid) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.redeem_community_reward(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.redeem_community_reward(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) TO authenticated;
ALTER FUNCTION public.ensure_loyalty_account(uuid) SET search_path = public;
ALTER FUNCTION public.recalculate_loyalty_level(uuid) SET search_path = public;
ALTER FUNCTION public.award_loyalty_points(uuid, integer, text, text, text, text, jsonb, uuid) SET search_path = public;
ALTER FUNCTION public.reverse_loyalty_points(uuid, integer, text, text, text, text, jsonb, uuid) SET search_path = public;
ALTER FUNCTION public.adjust_loyalty_points(uuid, integer, text, uuid) SET search_path = public;
ALTER FUNCTION public.redeem_community_reward(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.award_loyalty_points_for_ticket(uuid) SET search_path = public;
ALTER FUNCTION public.reverse_loyalty_points_for_ticket(uuid) SET search_path = public;
