-- Validación estructural y de seguridad — Sorteos de Comunidad
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
  v_internal_fns text[] := ARRAY[
    '_giveaway_audit_log(uuid,uuid,text,text,uuid,jsonb,jsonb,jsonb)',
    '_giveaway_level_bonus_quantity(jsonb,uuid)',
    '_giveaway_validate_eligibility(public.community_giveaways,uuid,public.community_members)',
    '_giveaway_format_public_name(text,uuid)'
  ];
  v_secdef_fns text[] := ARRAY[
    'enter_community_giveaway(uuid,uuid,integer,text)',
    'create_automatic_giveaway_entry(uuid,uuid,text,text,integer)',
    'cancel_community_giveaway(uuid,uuid,text)',
    'disqualify_community_giveaway_entry(uuid,uuid,text)',
    'draw_community_giveaway(uuid,uuid)',
    'activate_community_giveaway_alternate(uuid,uuid)',
    'claim_community_giveaway_prize(uuid,uuid)',
    'maintain_community_giveaways()',
    'get_public_community_giveaway_results(text)'
  ];
  v_fn_name text;
  v_has_auth boolean;
  v_has_anon boolean;
  v_has_public boolean;
  v_privilege text;
  v_policy_count integer;
  v_search_path text;
  v_col text;
BEGIN
  -- Tablas y RLS
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

  -- Política insegura eliminada
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'community_giveaway_winners'
    AND policyname = 'community_giveaway_winners_public_drawn';

  IF v_policy_count > 0 THEN
    RAISE EXCEPTION 'Persiste política insegura community_giveaway_winners_public_drawn';
  END IF;

  -- Política propia en winners
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'community_giveaway_winners'
    AND policyname = 'community_giveaway_winners_select_own';

  IF v_policy_count = 0 THEN
    RAISE EXCEPTION 'Falta política community_giveaway_winners_select_own';
  END IF;

  -- RPC administrativas no ejecutables por anon/authenticated
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

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name = split_part(v_fn_name, '(', 1)
        AND grantee = 'anon'
        AND privilege_type = 'EXECUTE'
    ) INTO v_has_anon;

    IF v_has_anon THEN
      RAISE EXCEPTION 'Función administrativa % accesible por anon', v_fn_name;
    END IF;
  END LOOP;

  -- Helpers internos sin EXECUTE público
  FOREACH v_fn_name IN ARRAY v_internal_fns LOOP
    v_fn := to_regprocedure('public.' || v_fn_name);
    IF v_fn IS NULL THEN
      RAISE EXCEPTION 'Falta helper interno %', v_fn_name;
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM information_schema.routine_privileges
      WHERE routine_schema = 'public'
        AND routine_name = split_part(v_fn_name, '(', 1)
        AND grantee IN ('PUBLIC', 'anon', 'authenticated')
        AND privilege_type = 'EXECUTE'
    ) INTO v_has_public;

    IF v_has_public THEN
      RAISE EXCEPTION 'Helper interno % tiene EXECUTE para clientes', v_fn_name;
    END IF;
  END LOOP;

  -- enter_community_giveaway requerida
  IF to_regprocedure('public.enter_community_giveaway(uuid,uuid,integer,text)') IS NULL THEN
    RAISE EXCEPTION 'Falta enter_community_giveaway';
  END IF;

  -- RPC pública sanitizada
  IF to_regprocedure('public.get_public_community_giveaway_results(text)') IS NULL THEN
    RAISE EXCEPTION 'Falta get_public_community_giveaway_results';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE routine_schema = 'public'
      AND routine_name = 'get_public_community_giveaway_results'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type = 'EXECUTE'
  ) INTO v_has_public;

  IF NOT v_has_public THEN
    RAISE EXCEPTION 'RPC pública no ejecutable por anon/authenticated';
  END IF;

  -- RPC pública no expone columnas sensibles en su firma de retorno
  FOREACH v_col IN ARRAY ARRAY[
    'user_id', 'entry_id', 'email', 'phone', 'metadata'
  ] LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_type t ON t.oid = p.prorettype
      WHERE n.nspname = 'public'
        AND p.proname = 'get_public_community_giveaway_results'
        AND pg_get_function_result(p.oid) ILIKE '%' || v_col || '%'
    ) THEN
      RAISE EXCEPTION 'RPC pública expone columna sensible: %', v_col;
    END IF;
  END LOOP;

  -- search_path en SECURITY DEFINER
  FOREACH v_fn_name IN ARRAY v_secdef_fns LOOP
    SELECT option_value INTO v_search_path
    FROM pg_options_to_table(
      (SELECT proconfig FROM pg_proc WHERE oid = to_regprocedure('public.' || v_fn_name))
    )
    WHERE option_name = 'search_path';

    IF v_search_path IS NULL OR v_search_path NOT LIKE '%pg_temp%' THEN
      RAISE EXCEPTION 'search_path incorrecto en %: %', v_fn_name, COALESCE(v_search_path, 'NULL');
    END IF;
  END LOOP;

  -- Grants: sin ALL innecesario en authenticated
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND table_name = v_table
        AND grantee = 'authenticated'
        AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')
    ) INTO v_has_auth;

    IF v_has_auth THEN
      RAISE EXCEPTION 'Grant de escritura en % para authenticated', v_table;
    END IF;
  END LOOP;

  -- Winners: anon sin SELECT
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name = 'community_giveaway_winners'
      AND grantee = 'anon'
      AND privilege_type = 'SELECT'
  ) INTO v_has_anon;

  IF v_has_anon THEN
    RAISE EXCEPTION 'anon tiene SELECT en community_giveaway_winners';
  END IF;

  -- Audit logs: sin acceso cliente
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name = 'community_giveaway_audit_logs'
      AND grantee IN ('anon', 'authenticated')
  ) INTO v_has_public;

  IF v_has_public THEN
    RAISE EXCEPTION 'community_giveaway_audit_logs accesible por clientes';
  END IF;

  -- Entries: sin INSERT directo para authenticated
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name = 'community_giveaway_entries'
      AND grantee = 'authenticated'
      AND privilege_type = 'INSERT'
  ) INTO v_has_auth;

  IF v_has_auth THEN
    RAISE EXCEPTION 'authenticated tiene INSERT en community_giveaway_entries';
  END IF;

  -- pgcrypto disponible
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'Extensión pgcrypto no instalada';
  END IF;

  RAISE NOTICE 'Validación de seguridad de sorteos OK';
END $$;
