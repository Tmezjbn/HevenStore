import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';
import { normalizeUsername } from './username';

/** Create profile row after signup or login. */
export async function ensureOwnProfile(
  fullName = '',
  user?: User | null,
  username?: string | null,
): Promise<{ ok: boolean; via: string; error?: string }> {
  const uid = user?.id ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) {
    return { ok: false, via: 'none', error: 'no-auth-user' };
  }

  const email = user?.email ?? (await supabase.auth.getUser()).data.user?.email ?? '';
  const metaUser =
    username ??
    (user?.user_metadata?.username as string | undefined) ??
    ((await supabase.auth.getUser()).data.user?.user_metadata?.username as string | undefined) ??
    null;
  const handle = metaUser ? normalizeUsername(metaUser) : null;

  const row: { id: string; email: string; full_name: string; username?: string } = {
    id: uid,
    email,
    full_name: fullName,
  };
  if (handle) row.username = handle;

  const { error: upsertErr } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });

  if (!upsertErr) {
    return { ok: true, via: 'upsert' };
  }

  const { error: rpcErr } = await supabase.rpc('ensure_own_profile', {
    p_full_name: fullName,
    p_username: handle,
  });

  if (rpcErr) {
    console.warn('ensure_own_profile:', rpcErr.message);
    return { ok: false, via: 'rpc', error: rpcErr.message };
  }

  return { ok: true, via: 'rpc' };
}
