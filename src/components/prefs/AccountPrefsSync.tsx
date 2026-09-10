import { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useAppearanceStore } from '../../stores/appearanceStore';
import {
  getAnalyticsConsent,
  onAnalyticsConsentChange,
  setAnalyticsConsent,
} from '../../lib/analyticsConsent';
import {
  parseAnalyticsConsent,
  parsePreferredMode,
  saveAccountPrefs,
  type AccountPrefsPatch,
} from '../../lib/accountPrefs';
import { normalizeSkinId } from '../../lib/appearance';

/**
 * Keeps privacy consent + theme choice on the signed-in profile.
 * localStorage remains the offline/guest cache; account wins on login when set.
 */
export default function AccountPrefsSync() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const { skin, mode, hasUserPickedSkin, hasUserPickedMode, hydrateFromAccount } =
    useAppearanceStore();
  const hydratedFor = useRef<string | null>(null);
  const skipNextSave = useRef(false);

  // Hydrate (or seed) account prefs once per login.
  useEffect(() => {
    if (!user?.id || !profile || profile.id !== user.id) return;
    if (hydratedFor.current === user.id) return;
    hydratedFor.current = user.id;

    const accountConsent = parseAnalyticsConsent(profile.analytics_consent);
    const localConsent = getAnalyticsConsent();
    if (accountConsent) {
      if (localConsent !== accountConsent) setAnalyticsConsent(accountConsent);
    } else if (localConsent) {
      void saveAccountPrefs({ analytics_consent: localConsent }).then((p) => {
        if (p) setProfile(p);
      });
    }

    const accountSkin = profile.preferred_skin
      ? normalizeSkinId(profile.preferred_skin)
      : null;
    const accountMode = parsePreferredMode(profile.preferred_mode);

    if (accountSkin || accountMode) {
      skipNextSave.current = true;
      hydrateFromAccount(accountSkin, accountMode);
    } else {
      const seed: AccountPrefsPatch = {};
      if (hasUserPickedSkin) seed.preferred_skin = skin;
      if (hasUserPickedMode) seed.preferred_mode = mode;
      if (Object.keys(seed).length) {
        void saveAccountPrefs(seed).then((p) => {
          if (p) setProfile(p);
        });
      }
    }
    // Intentionally once per user id after profile arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate gate
  }, [user?.id, profile?.id]);

  // Push theme changes while signed in.
  useEffect(() => {
    if (!user?.id) return;
    if (hydratedFor.current !== user.id) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (!hasUserPickedSkin && !hasUserPickedMode) return;

    const patch: AccountPrefsPatch = {};
    if (hasUserPickedSkin) patch.preferred_skin = skin;
    if (hasUserPickedMode) patch.preferred_mode = mode;

    const t = window.setTimeout(() => {
      void saveAccountPrefs(patch).then((p) => {
        if (p) setProfile(p);
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [user?.id, skin, mode, hasUserPickedSkin, hasUserPickedMode, setProfile]);

  // Push consent changes while signed in.
  useEffect(() => {
    if (!user?.id) return;
    return onAnalyticsConsentChange(() => {
      const c = getAnalyticsConsent();
      if (!c) return;
      void saveAccountPrefs({ analytics_consent: c }).then((p) => {
        if (p) setProfile(p);
      });
    });
  }, [user?.id, setProfile]);

  useEffect(() => {
    if (!user) hydratedFor.current = null;
  }, [user]);

  return null;
}
