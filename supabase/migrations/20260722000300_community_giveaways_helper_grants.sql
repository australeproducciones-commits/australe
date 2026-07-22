-- Revocar EXECUTE de helpers internos para roles cliente (aditivo)

REVOKE ALL ON FUNCTION public._giveaway_audit_log(uuid, uuid, text, text, uuid, jsonb, jsonb, jsonb)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public._giveaway_level_bonus_quantity(jsonb, uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public._giveaway_validate_eligibility(
  public.community_giveaways, uuid, public.community_members
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public._giveaway_format_public_name(text, uuid)
  FROM PUBLIC, anon, authenticated;
