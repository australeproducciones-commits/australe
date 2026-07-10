-- C1.1: Expiración obligatoria y aceptación atómica de invitaciones (aditivo)

ALTER TABLE public.community_event_invitations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

UPDATE public.community_event_invitations
SET expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL;

ALTER TABLE public.community_event_invitations
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS community_event_invitations_expires_at_idx
  ON public.community_event_invitations (expires_at);

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

  SELECT id
  INTO v_event_id
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
    'accepted', true
  );
END;
$$;

COMMENT ON FUNCTION public.accept_community_event_invitation(text) IS
  'Aceptación atómica de invitación: valida auth.uid(), expiración, destinatario y perfil activo; consume el token una sola vez.';

REVOKE ALL ON FUNCTION public.accept_community_event_invitation(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_community_event_invitation(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_community_event_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_community_event_invitation(text) TO service_role;

ALTER FUNCTION public.accept_community_event_invitation(text) SET search_path = public;
