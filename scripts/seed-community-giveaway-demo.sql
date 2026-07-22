-- Seed opcional de sorteo de prueba (solo local/staging)
-- Uso: psql $DATABASE_URL -f scripts/seed-community-giveaway-demo.sql
-- Idempotente por slug fijo.

INSERT INTO public.community_giveaways (
  name,
  slug,
  short_description,
  description,
  prize_description,
  terms_and_conditions,
  status,
  entry_type,
  points_cost,
  max_entries_per_user,
  allow_multiple_entries,
  winner_count,
  alternate_count,
  starts_at,
  closes_at,
  draw_at,
  claim_deadline,
  is_public,
  level_bonus_config
)
SELECT
  'Sorteo Comunidad Australe',
  'sorteo-comunidad-australe-demo',
  'Sorteo de prueba para validar el módulo en entornos seguros.',
  'Participá canjeando puntos de Comunidad. Este sorteo es solo para pruebas.',
  '2 entradas para un próximo evento',
  'Sorteo de demostración. No válido en producción.',
  'active',
  'points',
  100,
  5,
  true,
  1,
  2,
  now() - interval '1 hour',
  now() + interval '30 days',
  now() + interval '31 days',
  now() + interval '45 days',
  true,
  '{"default_quantity":1}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.community_giveaways WHERE slug = 'sorteo-comunidad-australe-demo'
);
