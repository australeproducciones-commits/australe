-- Validación estructural de sorteos de Comunidad
-- Uso: psql $DATABASE_URL -f scripts/validate-community-giveaways-security.sql

DO $$
DECLARE
  v_tables text[] := ARRAY[
    'community_giveaways',
    'community_giveaway_entries',
    'community_giveaway_winners',
    'community_giveaway_audit_logs'
  ];
  v_table text;
  v_rls boolean;
  v_fn regprocedure;
  v_admin_fns text[] := ARRAY[
    'draw_community_giveaway(uuid,uuid)',
    'cancel_community_giveaway(uuid,uuid,text)',
    'disqualify_community_giveaway_entry(uuid,uuid,text)',
    'activate_community_giveaway_alternate(uuid,uuid)',
    'create_automatic_giveaway_entry(uuid,uuid,text,text,integer)',
    'maintain_community_giveaways()'
  ];
  v_fn_name text;
  v_has_auth boolean;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass('public.' || v_table) IS NULL THEN
      RAISE EXCEPTION 'Falta tabla %', v_table;
    END IF;

    SELECT relrowsecurity INTO v_rls
    FROM pg_class
    WHERE oid = ('public.' || v_table)::regclass;

    IF NOT v_rls THEN
      RAISE EXCEPTION 'RLS deshabilitado en %', v_table;
    END IF;
  END LOOP;

  FOREACH v_fn_name IN ARRAY v_admin_fns LOOP
    v_fn := to_regprocedure('public.' || v_fn_name);
    IF v_fn IS NULL THEN
      RAISE EXCEPTION 'Falta función %', v_fn_name;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name = split_part(v_fn_name, '(', 1)
        AND grantee = 'authenticated'
        AND privilege_type = 'EXECUTE'
    ) INTO v_has_auth;

    IF v_has_auth THEN
      RAISE EXCEPTION 'Función administrativa % accesible por authenticated', v_fn_name;
    END IF;
  END LOOP;

  IF to_regprocedure('public.enter_community_giveaway(uuid,uuid,integer,text)') IS NULL THEN
    RAISE EXCEPTION 'Falta enter_community_giveaway';
  END IF;

  RAISE NOTICE 'Validación de sorteos OK';
END $$;
