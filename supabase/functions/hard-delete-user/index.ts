// Owner-only hard delete: archive snapshot → auth.admin.deleteUser → profiles CASCADE.
// Deploy: npx supabase functions deploy hard-delete-user --project-ref …
// Client: supabase.functions.invoke('hard-delete-user', { body: { user_id } })

import { createClient } from 'npm:@supabase/supabase-js@2';
import { archiveDeletedUser } from '../_shared/archiveDeletedUser.ts';

function corsHeaders(req: Request): Record<string, string> {
  const site = (Deno.env.get('SITE_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
  const origin = (req.headers.get('Origin') ?? '').replace(/\/$/, '');
  const allowed = new Set([site, 'http://localhost:5173', 'http://127.0.0.1:5173']);
  return {
    'Access-Control-Allow-Origin': allowed.has(origin) ? (req.headers.get('Origin') ?? site) : site,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(req) });
  if (req.method !== 'POST') return json(req, { error: 'method_not_allowed' }, 405);

  try {
    const { user_id: targetId } = await req.json();
    if (!targetId || typeof targetId !== 'string') {
      return json(req, { error: 'user_id_required' }, 400);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await anon.auth.getUser();
    if (userErr || !userData.user) return json(req, { error: 'unauthorized' }, 401);

    const callerId = userData.user.id;
    if (callerId === targetId) return json(req, { error: 'invalid_target' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: caller } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .maybeSingle();
    if (caller?.role !== 'owner') return json(req, { error: 'forbidden' }, 403);

    const { data: target } = await admin
      .from('profiles')
      .select('id, role, deletion_scheduled_at, full_name')
      .eq('id', targetId)
      .maybeSingle();
    if (!target) return json(req, { error: 'not_found' }, 404);
    if (target.role === 'owner') return json(req, { error: 'cannot_delete_owner' }, 403);
    if (!target.deletion_scheduled_at && target.full_name !== 'deleted') {
      return json(req, { error: 'not_scheduled' }, 409);
    }

    try {
      await archiveDeletedUser(admin, targetId, callerId);
    } catch (archErr) {
      console.error('archive failed:', targetId, archErr);
      return json(req, { error: 'archive_failed' }, 500);
    }

    const { error: cancelErr } = await admin
      .from('account_deletion_requests')
      .update({ status: 'cancelled', reviewed_at: new Date().toISOString(), reviewed_by: callerId })
      .eq('user_id', targetId)
      .in('status', ['pending', 'approved']);
    // Stale request rows must not block the delete — log for manual cleanup.
    if (cancelErr) console.error('deletion-request cancel failed:', targetId, cancelErr);

    const { error: delErr } = await admin.auth.admin.deleteUser(targetId);
    if (delErr) {
      console.error('deleteUser failed:', targetId, delErr.message);
      return json(req, { error: 'delete_failed' }, 500);
    }

    return json(req, { ok: true, deleted: targetId });
  } catch (e) {
    console.error('hard-delete-user error:', e);
    return json(req, { error: 'server_error' }, 500);
  }
});
