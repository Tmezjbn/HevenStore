-- Optional: delete abandoned pending orders older than 7 days (daily 04:00 UTC).
-- Requires pg_cron. Idempotent: unschedule + reschedule by name.
--
-- Dashboard alternative: Cron Jobs UI calling
--   SELECT public.cleanup_stale_pending_orders();

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-stale-pending-orders');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-stale-pending-orders',
  '0 4 * * *',
  $$SELECT public.cleanup_stale_pending_orders()$$
);
