-- Correctiva: funciones de tienda usan gen_random_bytes/digest (pgcrypto en schema extensions)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER FUNCTION public.generate_store_order_number()
  SET search_path = public, extensions;

ALTER FUNCTION public.create_store_order(
  text, text, text, uuid, uuid, jsonb, boolean
) SET search_path = public, extensions;

ALTER FUNCTION public.mark_store_order_delivered(uuid, text)
  SET search_path = public, extensions;
