-- Verificar permisos y existencia de reset_production_transactional_data
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  r.rolname AS grantee,
  has_function_privilege(r.oid, p.oid, 'EXECUTE') AS can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (
  SELECT oid, rolname FROM pg_roles
  WHERE rolname IN ('public', 'anon', 'authenticated', 'service_role', 'postgres')
) r
WHERE n.nspname = 'public'
  AND p.proname = 'reset_production_transactional_data'
ORDER BY r.rolname;
