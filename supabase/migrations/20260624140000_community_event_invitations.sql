-- Invitaciones de eventos desde el módulo admin de Comunidad (aditivo)

CREATE TABLE IF NOT EXISTS public.community_event_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events (id) ON DELETE CASCADE,
  invitation_type text NOT NULL DEFAULT 'informational',
  channel text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  message text,
  public_token text UNIQUE,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  opened_at timestamptz,
  accepted_at timestamptz,
  used_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT community_event_invitations_type_check CHECK (
    invitation_type IN ('informational', 'purchase_link')
  ),
  CONSTRAINT community_event_invitations_channel_check CHECK (
    channel IN ('whatsapp', 'email', 'internal', 'manual')
  ),
  CONSTRAINT community_event_invitations_status_check CHECK (
    status IN (
      'draft',
      'prepared',
      'sent',
      'opened',
      'accepted',
      'used',
      'expired',
      'cancelled',
      'failed'
    )
  )
);

CREATE INDEX IF NOT EXISTS community_event_invitations_user_id_idx
  ON public.community_event_invitations (user_id);

CREATE INDEX IF NOT EXISTS community_event_invitations_event_id_idx
  ON public.community_event_invitations (event_id);

CREATE INDEX IF NOT EXISTS community_event_invitations_status_idx
  ON public.community_event_invitations (status);

CREATE INDEX IF NOT EXISTS community_event_invitations_created_at_idx
  ON public.community_event_invitations (created_at DESC);

CREATE INDEX IF NOT EXISTS community_event_invitations_public_token_idx
  ON public.community_event_invitations (public_token)
  WHERE public_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS community_event_invitations_user_event_idx
  ON public.community_event_invitations (user_id, event_id, created_at DESC);

ALTER TABLE public.community_event_invitations ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.community_event_invitations IS
  'Invitaciones administrativas de usuarios de la comunidad a eventos.';

-- Sin políticas para anon/authenticated: acceso solo vía service_role en servidor.

CREATE OR REPLACE FUNCTION public.record_community_invitation_open(p_token text)
RETURNS public.community_event_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.community_event_invitations;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RAISE EXCEPTION 'record_community_invitation_open: token requerido';
  END IF;

  SELECT *
  INTO v_row
  FROM public.community_event_invitations
  WHERE public_token = trim(p_token)
    AND cancelled_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'record_community_invitation_open: invitación no encontrada';
  END IF;

  IF v_row.opened_at IS NULL THEN
    UPDATE public.community_event_invitations
    SET
      opened_at = now(),
      status = CASE
        WHEN status IN ('draft', 'prepared', 'sent') THEN 'opened'
        ELSE status
      END
    WHERE id = v_row.id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.record_community_invitation_open(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_community_invitation_open(text) TO service_role;

ALTER FUNCTION public.record_community_invitation_open(text) SET search_path = public;
