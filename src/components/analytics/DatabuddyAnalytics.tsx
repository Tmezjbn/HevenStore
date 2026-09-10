import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from '@databuddy/sdk/react';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { parsePrivacyConsentBanner } from '../../lib/siteSettings';
import {
  ensureDatabuddyScript,
  onAnalyticsConsentChange,
  removeDatabuddyScript,
  setPrivacyBannerRequired,
  shouldTrackAnalytics,
} from '../../lib/analyticsConsent';

/**
 * SPA pageviews for Databuddy — only after explicit accept.
 * Script is injected on accept; removed on decline / undecided.
 */
export default function DatabuddyAnalytics() {
  const { pathname, search } = useLocation();
  const { settings } = useSiteSettings();
  const bannerOn = parsePrivacyConsentBanner(settings.privacy_consent_banner);

  useEffect(() => {
    setPrivacyBannerRequired(bannerOn);
  }, [bannerOn]);

  useEffect(() => {
    const sync = () => {
      if (shouldTrackAnalytics()) ensureDatabuddyScript();
      else removeDatabuddyScript();
    };
    sync();
    return onAnalyticsConsentChange(sync);
  }, [bannerOn]);

  useEffect(() => {
    if (!shouldTrackAnalytics()) return;
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/auth')) return;

    ensureDatabuddyScript();

    const send = () => {
      if (!shouldTrackAnalytics()) return;
      track('screen_view', {
        path: pathname,
        search: search || undefined,
      });
    };

    if (typeof window !== 'undefined' && (window as unknown as { databuddy?: unknown }).databuddy) {
      send();
      return;
    }

    const t = window.setTimeout(send, 800);
    return () => window.clearTimeout(t);
  }, [pathname, search, bannerOn]);

  return null;
}
