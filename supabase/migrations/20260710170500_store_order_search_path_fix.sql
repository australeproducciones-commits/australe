-- Correctiva: create_store_order reemplazado en 20260710170400 perdió search_path extensions (pgcrypto).

ALTER FUNCTION public.create_store_order(
  text, text, text, uuid, uuid, jsonb, boolean
) SET search_path = public, extensions;

NOTIFY pgrst, 'reload schema';
