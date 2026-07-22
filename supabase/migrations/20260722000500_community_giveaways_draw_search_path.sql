-- pgcrypto vive en schema extensions en Supabase; draw usa gen_random_bytes

ALTER FUNCTION public.draw_community_giveaway(uuid, uuid)
  SET search_path = public, extensions, pg_temp;
