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
  const failedIds: string[] = [];
  for (const row of dueRows ?? []) {
    try {
      await archiveDeletedUser(admin, row.id, null);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('archive failed:', row.id, message);
      archiveFailures.push({ id: row.id, message });
      failedIds.push(row.id);
    }
  }

  // Claim anonymizes + deleteUser hard-deletes — neither may run for a user
  // whose archive failed (history would be lost forever). Postpone their due
  // date so claim skips them; the next cron run retries the archive.
  if (failedIds.length) {
    const retryAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: postponeErr } = await admin
      .from('profiles')
      .update({ deletion_scheduled_at: retryAt })
      .in('id', failedIds)
      // A restored account (deletion_scheduled_at cleared) must not be re-armed.
      .not('deletion_scheduled_at', 'is', null);
    if (postponeErr) {
      // Failing to postpone means they'd still be claimed unarchived —
      // abort the whole run rather than lose history.
      console.error('postpone failed for archive failures — aborting purge:', postponeErr);
      return new Response(
        JSON.stringify({ error: 'archive postpone failed, purge aborted', archiveFailures }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
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

  // TOCTOU: profiles can become due between the snapshot SELECT above and the
  // claim (e.g. admin_purge_user_now mid-run). A claimed id with no history row
  // would be hard-deleted unarchived — archive it now (post-anonymize is late,
  // but orders survive) before deleteUser.
  const { data: archivedRows } = await admin
    .from('account_deletion_history')
    .select('former_user_id')
    .in('former_user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']);
  const archivedIds = new Set((archivedRows ?? []).map((r) => r.former_user_id as string));
  for (const id of userIds) {
    if (archivedIds.has(id)) continue;
    try {
      await archiveDeletedUser(admin, id, null);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('late archive failed:', id, message);
      archiveFailures.push({ id, message });
    }
  }

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
