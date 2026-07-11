-- Expiración automática de reservas tienda: restringir RPC y habilitar pg_cron en staging.

REVOKE ALL ON FUNCTION public.expire_store_reservations()
  FROM PUBLIC, anon, authenticated;

-- Solo service_role / postgres ejecutan la expiración (cron Vercel o pg_cron).

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'expire_store_reservations_every_5m'
    ) THEN
      PERFORM cron.schedule(
        'expire_store_reservations_every_5m',
        '*/5 * * * *',
        $job$SELECT public.expire_store_reservations();$job$
      );
    END IF;
  END IF;
END $cron$;

COMMENT ON FUNCTION public.expire_store_reservations IS
  'Expira reservas vencidas (manual y MP pendientes). Idempotente. Invocar vía cron cada 5 min.';
