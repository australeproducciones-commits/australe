-- =============================================================================
-- Hardening de seguridad — Sorteos de Comunidad (aditivo)
-- Privacidad de ganadores, grants mínimos, search_path, RPC pública sanitizada
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Helper: nombre público sanitizado (servidor)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._giveaway_format_public_name(
  p_full_name text,
  p_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parts text[];
  v_first text;
  v_last_initial text;
BEGIN
  IF p_full_name IS NOT NULL AND length(trim(p_full_name)) > 0 THEN
    v_parts := regexp_split_to_array(trim(p_full_name), '\s+');
    v_first := v_parts[1];
    IF array_length(v_parts, 1) > 1 THEN
      v_last_initial := upper(left(v_parts[array_length(v_parts, 1)], 1)) || '.';
      RETURN trim(v_first || ' ' || v_last_initial);
    END IF;
    RETURN v_first;
  END IF;

  RETURN 'Miembro #' || upper(substr(replace(p_user_id::text, '-', ''), 1, 4));
END;
$$;

REVOKE ALL ON FUNCTION public._giveaway_format_public_name(text, uuid) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. RPC pública sanitizada de resultados
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_community_giveaway_results(
  p_giveaway_slug text
)
RETURNS TABLE (
  giveaway_name text,
  drawn_at timestamptz,
  participant_count integer,
  total_chances integer,
  display_name text,
  winner_type text,
  "position" integer,
  status_public text,
  selected_at timestamptz,
  claimed_at timestamptz,
  verification_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_giveaway public.community_giveaways%ROWTYPE;
  v_participants integer;
  v_chances integer;
  v_primary_code text;
BEGIN
  IF p_giveaway_slug IS NULL OR length(trim(p_giveaway_slug)) = 0 THEN
    RETURN;
  END IF;

  SELECT * INTO v_giveaway
  FROM public.community_giveaways g
  WHERE g.slug = trim(p_giveaway_slug)
    AND g.is_public = true
    AND g.status = 'drawn';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COUNT(DISTINCT e.user_id)::integer,
         COALESCE(SUM(e.entry_quantity), 0)::integer
    INTO v_participants, v_chances
    FROM public.community_giveaway_entries e
    WHERE e.giveaway_id = v_giveaway.id
      AND e.status = 'active';

  SELECT w.verification_code INTO v_primary_code
  FROM public.community_giveaway_winners w
  WHERE w.giveaway_id = v_giveaway.id
    AND w.winner_type = 'winner'
    AND w.position = 1
  LIMIT 1;

  IF EXISTS (
    SELECT 1
    FROM public.community_giveaway_winners w
    WHERE w.giveaway_id = v_giveaway.id
  ) THEN
    RETURN QUERY
    SELECT
      v_giveaway.name,
      v_giveaway.drawn_at,
      v_participants,
      v_chances,
      public._giveaway_format_public_name(p.full_name, w.user_id),
      w.winner_type,
      w.position,
      CASE w.status
        WHEN 'selected' THEN 'Seleccionado'
        WHEN 'notified' THEN 'Notificado'
        WHEN 'claimed' THEN 'Premio reclamado'
        WHEN 'expired' THEN 'Plazo vencido'
        WHEN 'rejected' THEN 'Rechazado'
        WHEN 'replaced' THEN 'Reemplazado'
        ELSE w.status
      END,
      w.selected_at,
      w.claimed_at,
      CASE
        WHEN w.winner_type = 'winner' AND w.position = 1 THEN w.verification_code
        ELSE NULL
      END
    FROM public.community_giveaway_winners w
    LEFT JOIN public.profiles p ON p.id = w.user_id
    WHERE w.giveaway_id = v_giveaway.id
    ORDER BY w.winner_type ASC, w.position ASC;
  ELSE
    RETURN QUERY
    SELECT
      v_giveaway.name,
      v_giveaway.drawn_at,
      v_participants,
      v_chances,
      NULL::text,
      NULL::text,
      NULL::integer,
      NULL::text,
      NULL::timestamptz,
      NULL::timestamptz,
      v_primary_code;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_community_giveaway_results(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_community_giveaway_results(text) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. RLS — eliminar política insegura de winners
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS community_giveaway_winners_public_drawn ON public.community_giveaway_winners;

DROP POLICY IF EXISTS community_giveaway_winners_select_own ON public.community_giveaway_winners;
CREATE POLICY community_giveaway_winners_select_own
  ON public.community_giveaway_winners FOR SELECT
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. Grants — principio de mínimo privilegio
-- -----------------------------------------------------------------------------

REVOKE ALL ON public.community_giveaways FROM authenticated;
REVOKE ALL ON public.community_giveaway_entries FROM authenticated;
REVOKE ALL ON public.community_giveaway_winners FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.community_giveaway_audit_logs FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.community_giveaways TO anon, authenticated;
GRANT SELECT ON public.community_giveaway_entries TO authenticated;
GRANT SELECT ON public.community_giveaway_winners TO authenticated;
-- audit_logs: solo service_role / admin vía servidor (sin GRANT a clientes)

-- -----------------------------------------------------------------------------
-- 5. search_path en todas las funciones del módulo
-- -----------------------------------------------------------------------------

ALTER FUNCTION public._giveaway_audit_log(uuid, uuid, text, text, uuid, jsonb, jsonb, jsonb)
  SET search_path = public, pg_temp;
ALTER FUNCTION public._giveaway_level_bonus_quantity(jsonb, uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public._giveaway_validate_eligibility(public.community_giveaways, uuid, public.community_members)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.enter_community_giveaway(uuid, uuid, integer, text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.create_automatic_giveaway_entry(uuid, uuid, text, text, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.cancel_community_giveaway(uuid, uuid, text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.disqualify_community_giveaway_entry(uuid, uuid, text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.draw_community_giveaway(uuid, uuid)
  SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.activate_community_giveaway_alternate(uuid, uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.claim_community_giveaway_prize(uuid, uuid)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.maintain_community_giveaways()
  SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_community_giveaway_results(text)
  SET search_path = public, pg_temp;
ALTER FUNCTION public._giveaway_format_public_name(text, uuid)
  SET search_path = public, pg_temp;
