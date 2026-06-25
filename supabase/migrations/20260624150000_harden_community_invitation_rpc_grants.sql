-- Endurecimiento aditivo: revocar RPC de invitaciones a roles públicos

REVOKE ALL ON FUNCTION public.record_community_invitation_open(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_community_invitation_open(text) FROM anon;
REVOKE ALL ON FUNCTION public.record_community_invitation_open(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_community_invitation_open(text) TO service_role;

ALTER FUNCTION public.record_community_invitation_open(text) SET search_path = public;
