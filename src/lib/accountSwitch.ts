import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { MultiAccountRoleFlags } from './siteSettings';
import type { Role } from '../types';
import { useCartStore } from '../stores/cartStore';
import { useWishlistStore } from '../stores/wishlistStore';

export const ACCOUNT_PARK_KEY = 'heven.account-park';

export type ParkedAccount = {
  userId: string;
  email: string;
  username: string | null;
  fullName: string | null;
  role: Role | null;
  access_token: string;
  refresh_token: string;
  expires_at?: number;
};

export type AccountMeta = {
  email?: string | null;
  username?: string | null;
  fullName?: string | null;
  role?: Role | null;
};

const listeners = new Set<() => void>();

/** >0 while swap in progress — AuthProvider must not clear user on transient null. */
let switchGate = 0;

export function isAccountSwitchInFlight(): boolean {
  return switchGate > 0;
}

function beginSwitch() {
  switchGate += 1;
}

function endSwitch() {
  switchGate = Math.max(0, switchGate - 1);
}

export function subscribePark(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitPark() {
  listeners.forEach((fn) => fn());
}

export function loadPark(): ParkedAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_PARK_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<ParkedAccount>;
    if (
      typeof o.userId !== 'string' ||
      typeof o.access_token !== 'string' ||
      typeof o.refresh_token !== 'string'
    ) {
      return null;
    }
    return {
      userId: o.userId,
      email: typeof o.email === 'string' ? o.email : '',
      username: typeof o.username === 'string' ? o.username : null,
      fullName: typeof o.fullName === 'string' ? o.fullName : null,
      role: (o.role as Role | null) ?? null,
      access_token: o.access_token,
      refresh_token: o.refresh_token,
      expires_at: typeof o.expires_at === 'number' ? o.expires_at : undefined,
    };
  } catch {
    return null;
  }
}

export function savePark(park: ParkedAccount, opts?: { emit?: boolean }): void {
  localStorage.setItem(ACCOUNT_PARK_KEY, JSON.stringify(park));
  if (opts?.emit !== false) emitPark();
}

export function clearPark(): void {
  localStorage.removeItem(ACCOUNT_PARK_KEY);
  emitPark();
}

/** Owner always; admin/moderator/support/seller only when owner enabled that role. */
export function canAddSecondAccount(
  role: Role | null | undefined,
  flags: MultiAccountRoleFlags,
): boolean {
  if (!role) return false;
  if (role === 'owner') return true;
  if (role === 'admin') return flags.admin === true;
  if (role === 'moderator') return flags.moderator === true;
  if (role === 'support') return flags.support === true;
  if (role === 'seller') return flags.seller === true;
  return false;
}

function sessionToPark(
  access_token: string,
  refresh_token: string,
  userId: string,
  meta: AccountMeta,
  expires_at?: number,
): ParkedAccount {
  return {
    userId,
    email: (meta.email || '').trim(),
    username: meta.username?.trim() || null,
    fullName: meta.fullName?.trim() || null,
    role: meta.role ?? null,
    access_token,
    refresh_token,
    expires_at,
  };
}

/**
 * Drop the live client session from storage/memory without calling /logout.
 * `signOut({ scope: 'local' })` still hits `/logout?scope=local` and revokes
 * the refresh token — which kills the park we just saved.
 */
async function clearLocalSessionNoRevoke(): Promise<void> {
  const auth = supabase.auth as unknown as {
    _removeSession?: () => Promise<void>;
    storageKey?: string;
    storage?: { removeItem: (key: string) => void | Promise<void> };
    _notifyAllSubscribers?: (event: 'SIGNED_OUT', session: null) => Promise<void>;
  };

  if (typeof auth._removeSession === 'function') {
    await auth._removeSession();
    return;
  }

  const key = auth.storageKey;
  if (key && auth.storage) {
    await Promise.resolve(auth.storage.removeItem(key));
    await Promise.resolve(auth.storage.removeItem(`${key}-code-verifier`));
    await Promise.resolve(auth.storage.removeItem(`${key}-user`));
  }
  if (typeof auth._notifyAllSubscribers === 'function') {
    await auth._notifyAllSubscribers('SIGNED_OUT', null);
  } else {
    const { useAuthStore } = await import('../stores/authStore');
    useAuthStore.getState().setSession(null);
  }
}

/**
 * Hydrate + refresh parked tokens on an isolated client (memory storage).
 * Never touches the live `supabase` session / storage.
 */
async function materializeParkSession(park: ParkedAccount): Promise<ParkedAccount | null> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anon) return null;

  const memory = new Map<string, string>();
  const parkClient = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => {
          memory.set(key, value);
        },
        removeItem: (key) => {
          memory.delete(key);
        },
      },
    },
  });

  const { data, error } = await parkClient.auth.setSession({
    access_token: park.access_token,
    refresh_token: park.refresh_token,
  });
  if (error || !data.session) return null;

  let session = data.session;
  const now = Math.floor(Date.now() / 1000);
  // Refresh when expired or within 90s so main setSession takes the non-expired path.
  if (!session.expires_at || session.expires_at <= now + 90) {
    const refreshed = await parkClient.auth.refreshSession();
    if (refreshed.error || !refreshed.data.session) return null;
    session = refreshed.data.session;
  }

  if (session.user.id !== park.userId) return null;

  return {
    ...park,
    userId: session.user.id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
  };
}

/** Park active session and clear local Supabase session (park stays). */
export async function parkCurrentAndSignOutLocal(meta: AccountMeta): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token || !session.refresh_token) return false;

  // Silent write: emit before detach races UI sync while park still equals live user.
  savePark(
    sessionToPark(
      session.access_token,
      session.refresh_token,
      session.user.id,
      {
        email: meta.email ?? session.user.email,
        username: meta.username,
        fullName: meta.fullName,
        role: meta.role,
      },
      session.expires_at,
    ),
    { emit: false },
  );

  await clearLocalSessionNoRevoke();
  emitPark();
  return true;
}

async function syncAuthStoreFromSupabase() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // Dynamic import avoids authStore ↔ accountSwitch cycle at module init.
  const { useAuthStore } = await import('../stores/authStore');
  useAuthStore.getState().setSession(session);
}

async function restoreLiveSession(
  outgoing: ParkedAccount,
): Promise<boolean> {
  const { data, error } = await supabase.auth.setSession({
    access_token: outgoing.access_token,
    refresh_token: outgoing.refresh_token,
  });
  if (!error && data.session?.user.id === outgoing.userId) return true;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return Boolean(session?.user.id === outgoing.userId);
}

/**
 * Swap active ↔ parked.
 * Park tokens refresh on an isolated client; live auto-refresh is paused so the
 * outgoing refresh token isn't rotated out from under the restore path.
 */
export async function switchToParked(
  activeMeta: AccountMeta,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parked = loadPark();
  if (!parked) return { ok: false, error: 'no_park' };

  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token || !session.refresh_token) {
    return { ok: false, error: 'no_session' };
  }

  const outgoingUserId = session.user.id;
  if (outgoingUserId === parked.userId) {
    clearPark();
    return { ok: false, error: 'same_account' };
  }

  beginSwitch();
  let stoppedRefresh = false;
  try {
    await supabase.auth.stopAutoRefresh();
    stoppedRefresh = true;

    const ready = await materializeParkSession(parked);
    if (!ready) {
      return { ok: false, error: 'park_refresh_failed' };
    }

    // Re-read live session AFTER park hydrate — tokens may have rotated.
    const live = (await supabase.auth.getSession()).data.session;
    if (!live?.access_token || !live.refresh_token || live.user.id !== outgoingUserId) {
      return { ok: false, error: 'session_changed' };
    }
    const outgoing = sessionToPark(
      live.access_token,
      live.refresh_token,
      live.user.id,
      {
        email: activeMeta.email ?? live.user.email,
        username: activeMeta.username,
        fullName: activeMeta.fullName,
        role: activeMeta.role,
      },
      live.expires_at,
    );

    // Persist rotated park tokens before live swap — silent so UI does not
    // briefly see park === incoming user.
    savePark(ready, { emit: false });

    const { data: next, error } = await supabase.auth.setSession({
      access_token: ready.access_token,
      refresh_token: ready.refresh_token,
    });

    if (error || !next.session || next.session.user.id !== ready.userId) {
      const restored = await restoreLiveSession(outgoing);
      if (!restored) {
        // Keep park as ready (still the other account); live session is gone.
        return { ok: false, error: 'restore_failed' };
      }
      savePark(ready);
      return { ok: false, error: error?.message || 'switch_failed' };
    }

    savePark(outgoing);
    useCartStore.getState().clearCart();
    useWishlistStore.getState().clear();
    emitPark();
    return { ok: true };
  } finally {
    endSwitch();
    if (stoppedRefresh) {
      try {
        await supabase.auth.startAutoRefresh();
      } catch {
        /* ignore */
      }
    }
    // Gate is open — sync Zustand (null during switch was ignored).
    await syncAuthStoreFromSupabase();
  }
}

/** Drop park if it matches the newly signed-in user (same account). */
export function dropParkIfSameUser(userId: string): void {
  if (isAccountSwitchInFlight()) return;
  const parked = loadPark();
  if (parked && parked.userId === userId) clearPark();
}
