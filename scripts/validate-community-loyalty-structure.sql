-- Estructura del módulo Comunidad (solo lectura)
SELECT 'tables' AS check_type, tablename, rowsecurity::text AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'community_settings',
    'community_levels',
    'loyalty_accounts',
    'loyalty_transactions',
    'community_rewards',
    'community_redemptions',
    'community_members'
  )
ORDER BY tablename;

SELECT 'community_members_count' AS check_type, count(*)::text AS value
FROM public.community_members;

SELECT 'community_levels' AS check_type, name, minimum_lifetime_points::text AS min_pts, sort_order::text
FROM public.community_levels
ORDER BY sort_order;

SELECT 'community_settings' AS check_type, id::text, community_enabled::text, amount_per_point::text, welcome_points::text
FROM public.community_settings
WHERE id = 1;

SELECT 'rpc_functions' AS check_type,
  p.proname,
  p.prosecdef::text AS security_definer,
  COALESCE(array_to_string(p.proconfig, ','), '') AS config
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'ensure_loyalty_account',
    'recalculate_loyalty_level',
    'award_loyalty_points',
    'reverse_loyalty_points',
    'adjust_loyalty_points',
    'redeem_community_reward',
    'award_loyalty_points_for_ticket',
    'reverse_loyalty_points_for_ticket'
  )
ORDER BY p.proname;

SELECT 'rpc_grants' AS check_type,
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN (
    'ensure_loyalty_account',
    'recalculate_loyalty_level',
    'award_loyalty_points',
    'reverse_loyalty_points',
    'adjust_loyalty_points',
    'redeem_community_reward',
    'award_loyalty_points_for_ticket',
    'reverse_loyalty_points_for_ticket'
  )
ORDER BY routine_name, grantee;
