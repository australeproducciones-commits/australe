-- C1.1.1: Preview y apertura autenticados sin service_role en SSR público

CREATE OR REPLACE FUNCTION public.preview_community_event_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_row public.community_event_invitations;
  v_profile public.profiles;
  v_event public.events;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('state', 'login_required');
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN jsonb_build_object('state', 'unavailable');
  END IF;

  SELECT *
  INTO v_row
  FROM public.community_event_invitations
  WHERE public_token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'unavailable');
  END IF;

  IF v_row.cancelled_at IS NOT NULL OR v_row.status = 'cancelled' THEN
    RETURN jsonb_build_object('state', 'unavailable');
  END IF;

  IF v_row.status IN ('accepted', 'used')
     OR v_row.accepted_at IS NOT NULL
     OR v_row.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('state', 'already_used');
  END IF;

  IF v_row.expires_at <= now() THEN
    RETURN jsonb_build_object('state', 'expired');
  END IF;

  IF v_row.user_id <> v_uid THEN
    RETURN jsonb_build_object('state', 'wrong_account');
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object('state', 'disabled');
  END IF;

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = v_row.event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'unavailable');
  END IF;

  RETURN jsonb_build_object(
    'state', 'ready',
    'expires_at', v_row.expires_at,
    'event', jsonb_build_object(
      'name', v_event.name,
      'slug', v_event.slug,
      'event_date', v_event.event_date
    )
  );
END;
$$;

COMMENT ON FUNCTION public.preview_community_event_invitation(text) IS
  'Vista previa de invitación para auth.uid(): estados controlados sin exponer datos de terceros.';

REVOKE ALL ON FUNCTION public.preview_community_event_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.preview_community_event_invitation(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.preview_community_event_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.preview_community_event_invitation(text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_community_invitation_open_authenticated(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_row public.community_event_invitations;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN;
  END IF;

  SELECT *
  INTO v_row
  FROM public.community_event_invitations
  WHERE public_token = trim(p_token)
    AND cancelled_at IS NULL
    AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_row.opened_at IS NULL THEN
    UPDATE public.community_event_invitations
    SET
      opened_at = now(),
      status = CASE
        WHEN status IN ('draft', 'prepared', 'sent') THEN 'opened'
        ELSE status
      END
    WHERE id = v_row.id;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.record_community_invitation_open_authenticated(text) IS
  'Registra apertura de invitación solo si auth.uid() es el destinatario.';

REVOKE ALL ON FUNCTION public.record_community_invitation_open_authenticated(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_community_invitation_open_authenticated(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_community_invitation_open_authenticated(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_community_invitation_open_authenticated(text) TO service_role;

CREATE OR REPLACE FUNCTION public.accept_community_event_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_row public.community_event_invitations;
  v_profile public.profiles;
  v_event public.events;
  v_event_id uuid;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'accept_community_event_invitation: not authenticated'
      USING ERRCODE = '28000';
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'accept_community_event_invitation: invitation not available'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_row
  FROM public.community_event_invitations
  WHERE public_token = trim(p_token)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'accept_community_event_invitation: invitation not available'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_row.cancelled_at IS NOT NULL OR v_row.status = 'cancelled' THEN
    RAISE EXCEPTION 'accept_community_event_invitation: invitation not available'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_row.expires_at <= now() THEN
    RAISE EXCEPTION 'accept_community_event_invitation: invitation expired'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_row.status IN ('accepted', 'used')
     OR v_row.accepted_at IS NOT NULL
     OR v_row.used_at IS NOT NULL THEN
    RAISE EXCEPTION 'accept_community_event_invitation: invitation already used'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_row.user_id <> v_uid THEN
    RAISE EXCEPTION 'accept_community_event_invitation: invitation not for this account'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_uid;

  IF NOT FOUND OR v_profile.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'accept_community_event_invitation: account not enabled'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = v_row.event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'accept_community_event_invitation: invitation not available'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.community_event_invitations
  SET
    status = 'accepted',
    accepted_at = now(),
    accepted_by = v_uid,
    used_at = now()
  WHERE id = v_row.id
  RETURNING event_id INTO v_event_id;

  RETURN jsonb_build_object(
    'invitation_id', v_row.id,
    'event_id', v_event_id,
    'event_slug', v_event.slug,
    'accepted', true
  );
END;
$$;
