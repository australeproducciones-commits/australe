-- Revocar acceso anónimo a create_public_kiosk_order_linked
REVOKE EXECUTE ON FUNCTION public.create_public_kiosk_order_linked(
  uuid, uuid, text, text, text, text, text, jsonb
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_public_kiosk_order_linked(
  uuid, uuid, text, text, text, text, text, jsonb
) TO authenticated;
