-- Daily 03:00 UTC: soft-anonymize due accounts + hard-delete auth.users via edge fn.
-- Prerequisites:
--   1) Enable extensions: pg_cron, pg_net (Database → Extensions)
--   2) Apply migration 20260712190000_hard_purge_auth_users.sql
--   3) Deploy: npx supabase functions deploy purge-deleted-accounts --no-verify-jwt --project-ref <ref>
--   4) Secret:  npx supabase secrets set PURGE_CRON_SECRET=<random> --project-ref <ref>
--   5) Replace <PURGE_CRON_SECRET> below with that same value, then run this file once in the SQL editor.
--      NEVER commit the real value. Rotate if it ever lands in git.
--
-- Idempotent: unschedule + reschedule by name.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('purge-due-account-deletions');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Paste live secret only in the SQL editor after `supabase secrets set`. Do not commit it.
SELECT cron.schedule(
  'purge-due-account-deletions',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zeupffmhntpkrmjwjrcp.supabase.co/functions/v1/purge-deleted-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-purge-secret', '<PURGE_CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
