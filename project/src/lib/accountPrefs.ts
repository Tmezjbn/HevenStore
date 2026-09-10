import { supabase } from './supabase';
import type { AnalyticsConsentChoice, Profile } from '../types';
import type { Mode, SkinId } from './appearance';
import { normalizeSkinId } from './appearance';
import { PROFILE_COLS } from '../stores/authStore';

export type AccountPrefsPatch = {
  analytics_consent?: AnalyticsConsentChoice | null;
  preferred_skin?: SkinId | null;
  preferred_mode?: Mode | null;
};

/** Persist prefs to the signed-in profile. No-op when logged out. */
export async function saveAccountPrefs(patch: AccountPrefsPatch): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;

  const body: Record<string, string | null> = {};
  if ('analytics_consent' in patch) body.analytics_consent = patch.analytics_consent ?? null;
  if ('preferred_skin' in patch) {
    body.preferred_skin = patch.preferred_skin ? normalizeSkinId(patch.preferred_skin) : null;
  }
  if ('preferred_mode' in patch) {
    body.preferred_mode =
      patch.preferred_mode === 'dark' || patch.preferred_mode === 'light'
        ? patch.preferred_mode
        : null;
  }
  if (Object.keys(body).length === 0) return null;

  const { data, error } = await supabase
    .from('profiles')
    .update(body)
    .eq('id', uid)
    .select(PROFILE_COLS)
    .maybeSingle();

  if (error) {
    console.warn('saveAccountPrefs:', error.message);
    return null;
  }
  return (data as unknown as Profile | null) ?? null;
}

export function parsePreferredMode(v: unknown): Mode | null {
  return v === 'dark' || v === 'light' ? v : null;
}

export function parseAnalyticsConsent(v: unknown): AnalyticsConsentChoice | null {
  return v === 'accepted' || v === 'declined' ? v : null;
}
