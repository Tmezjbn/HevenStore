// Soft-purge due accounts then hard-delete auth.users (service role).
// Archives profile + orders BEFORE claim anonymizes, so history keeps real details.
// Deploy: npx supabase functions deploy purge-deleted-accounts --no-verify-jwt
// Secret:  npx supabase secrets set PURGE_CRON_SECRET=... --project-ref ...
// Cron:    supabase/cron/purge_due_account_deletions.sql (pg_net → this fn)

import { createClient } from 'npm:@supabase/supabase-js@2';
import { archiveDeletedUser } from '../_shared/archiveDeletedUser.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const secret = Deno.env.get('PURGE_CRON_SECRET');
  if (!secret || req.headers.get('x-purge-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Archive while profile still has identity (before claim soft-wipe).
  const { data: dueRows, error: dueErr } = await admin
    .from('profiles')
    .select('id')
    .not('deletion_scheduled_at', 'is', null)
    .lte('deletion_scheduled_at', new Date().toISOString())
    .neq('role', 'owner');
  if (dueErr) {
    console.error('due profiles query failed:', dueErr);
    return new Response(JSON.stringify({ error: dueErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const archiveFailures: { id: string; message: string }[] = [];
  for (const row of dueRows ?? []) {
    try {
      await archiveDeletedUser(admin, row.id, null);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('archive failed:', row.id, message);
      archiveFailures.push({ id: row.id, message });
    }
  }

  const { data: ids, error } = await admin.rpc('claim_due_account_deletions');
  if (error) {
    console.error('claim_due_account_deletions failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userIds = (Array.isArray(ids) ? ids : []) as string[];
  let deleted = 0;
  const failures: { id: string; message: string }[] = [];

  for (const id of userIds) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id);
    if (delErr) {
      console.error('deleteUser failed:', id, delErr.message);
      failures.push({ id, message: delErr.message });
      continue;
    }
    deleted += 1;
  }

  return new Response(
    JSON.stringify({
      claimed: userIds.length,
      deleted,
      failures,
      archiveFailures,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
