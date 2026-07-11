-- Habilita pg_cron y job de expiración cada 5 min (staging).
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'expire_store_reservations_every_5m'
    ) THEN
      PERFORM cron.unschedule(
        (SELECT jobid FROM cron.job WHERE jobname = 'expire_store_reservations_every_5m' LIMIT 1)
      );
    END IF;
    PERFORM cron.schedule(
      'expire_store_reservations_every_5m',
      '*/5 * * * *',
      $job$SELECT public.expire_store_reservations();$job$
    );
  END IF;
END $cron$;
