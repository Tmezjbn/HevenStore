import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';
import type { User, Session } from '@supabase/supabase-js';
import { ensureOwnProfile } from '../lib/ensureProfile';
import {
  clearPark,
  dropParkIfSameUser,
  parkCurrentAndSignOutLocal,
  switchToParked,
  type AccountMeta,
} from '../lib/accountSwitch';
import { useCartStore } from './cartStore';
import { useWishlistStore } from './wishlistStore';

function clearLocalCommerce() {
  useCartStore.getState().clearCart();
  useWishlistStore.getState().clear();
}

/** Own-row profile fields the client actually reads. */
export const PROFILE_COLS = [
  'id',
  'email',
  'username',
  'full_name',
  'avatar_url',
  'role',
  'is_active',
  'support_standing',
  'staff_notes',
  'show_seller_name',
  'show_badges',
  'analytics_consent',
  'preferred_skin',
  'preferred_mode',
  'deletion_scheduled_at',
  'disabled_until',
  'username_changed_at',
  'created_at',
  'updated_at',
].join(',');

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: (userId: string, fullName?: string) => Promise<void>;
  /** Active only — parked second account stays. */
  signOut: () => Promise<void>;
  signOutBoth: () => Promise<void>;
  addSecondAccount: () => Promise<boolean>;
  switchAccount: () => Promise<{ ok: true } | { ok: false; error: string }>;
  removeParkedAccount: () => void;
}

function profileMeta(profile: Profile | null, user: User | null): AccountMeta {
  return {
    email: profile?.email ?? user?.email,
    username: profile?.username,
    fullName: profile?.full_name,
    role: profile?.role,
  };
}

/** Active profile, or null after sign-out for still-disabled accounts. */
async function resolveActiveProfile(
  profile: Profile | null,
  stale?: () => boolean,
): Promise<Profile | null> {
  if (!profile) return null;
  if (profile.is_active) return profile;

  if (profile.disabled_until && !profile.deletion_scheduled_at) {
    const until = Date.parse(profile.disabled_until);
    if (Number.isFinite(until) && until <= Date.now()) {
      await supabase.rpc('clear_expired_user_disable');
      const { data } = await supabase
        .from('profiles')
        .select(PROFILE_COLS)
        .eq('id', profile.id)
        .maybeSingle();
      if ((data as Profile | null)?.is_active) return data as unknown as Profile;
    }
  }

  // Account switched while resolving — the live session belongs to someone
  // else now; signing out would kill it.
  if (stale?.()) return null;
  await supabase.auth.signOut();
  // Same clear as the public signOut paths — the kicked account's cart/wishlist
  // must not leak to whoever signs in on this device next.
  clearLocalCommerce();
  return null;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => {
    if (!session) {
      set({ session: null, user: null, profile: null, loading: false });
      return;
    }
    const prevId = get().user?.id;
    const sameUser = prevId === session.user.id;
    set({
      session,
      user: session.user,
      loading: false,
      // Drop stale profile when switching accounts so role guards wait.
      ...(sameUser ? {} : { profile: null }),
    });
  },
  setProfile: (profile) => set({ profile }),
  fetchProfile: async (userId: string, fullName = '') => {
    // In-flight fetches can resolve after an account switch — committing a
    // stale row (or its signOut side-effect) must not clobber the new session.
    const stale = () => get().user?.id !== userId;
    const commit = async (row: Profile | null) => {
      const next = await resolveActiveProfile(row, stale);
      if (stale()) return;
      if (row && !next) {
        set({ user: null, session: null, profile: null });
        return;
      }
      set({ profile: next });
      if (next) dropParkIfSameUser(next.id);
    };

    const { data } = await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .eq('id', userId)
      .maybeSingle();

    if (data) {
      await commit(data as unknown as Profile);
      return;
    }

    const { data: authUser } = await supabase.auth.getUser();
    await ensureOwnProfile(fullName, authUser.user);

    const { data: retry } = await supabase
      .from('profiles')
      .select(PROFILE_COLS)
      .eq('id', userId)
      .maybeSingle();
    await commit((retry as unknown as Profile | null) ?? null);
  },
  signOut: async () => {
    await supabase.auth.signOut();
    clearLocalCommerce();
    set({ user: null, session: null, profile: null });
  },
  signOutBoth: async () => {
    clearPark();
    await supabase.auth.signOut();
    clearLocalCommerce();
    set({ user: null, session: null, profile: null });
  },
  addSecondAccount: async () => {
    const { profile, user } = get();
    return parkCurrentAndSignOutLocal(profileMeta(profile, user));
  },
  switchAccount: async () => {
    const { profile, user } = get();
    return switchToParked(profileMeta(profile, user));
  },
  removeParkedAccount: () => {
    clearPark();
  },
}));
