import { useEffect, useState } from 'react';
import { useI18n } from '../../lib/i18n';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { parsePrivacyConsentBanner } from '../../lib/siteSettings';
import {
  onAnalyticsConsentChange,
  setAnalyticsConsent,
  setPrivacyBannerRequired,
  shouldShowPrivacyBanner,
} from '../../lib/analyticsConsent';

/** Mid of 5–7s: wait this long after the user starts scrolling, then reveal. */
const REVEAL_AFTER_MS = 6000;
const SCROLL_ARM_PX = 48;

export default function PrivacyConsentBanner() {
  const { t } = useI18n();
  const { settings } = useSiteSettings();
  const bannerOn = parsePrivacyConsentBanner(settings.privacy_consent_banner);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setPrivacyBannerRequired(bannerOn);
    setNeedsConsent(shouldShowPrivacyBanner());
    return onAnalyticsConsentChange(() => setNeedsConsent(shouldShowPrivacyBanner()));
  }, [bannerOn]);

  useEffect(() => {
    if (!needsConsent || revealed) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let armed = false;

    const arm = () => {
      if (armed) return;
      armed = true;
      timer = setTimeout(() => setRevealed(true), REVEAL_AFTER_MS);
    };

    if (window.scrollY >= SCROLL_ARM_PX) {
      arm();
    } else {
      const onScroll = () => {
        if (window.scrollY < SCROLL_ARM_PX) return;
        window.removeEventListener('scroll', onScroll);
        arm();
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', onScroll);
        if (timer) clearTimeout(timer);
      };
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [needsConsent, revealed]);

  if (!needsConsent || !revealed) return null;

  const choose = (value: 'accepted' | 'declined') => {
    setAnalyticsConsent(value);
    setNeedsConsent(false);
  };

  return (
    <aside
      className="privacy-consent"
      role="dialog"
      aria-labelledby="privacy-consent-title"
      aria-describedby="privacy-consent-desc"
    >
      <div className="privacy-consent__panel">
        <div className="privacy-consent__copy text-start">
          <h2 id="privacy-consent-title" className="privacy-consent__title">
            {t('نحترم خصوصيتك', 'We value your privacy')}
          </h2>
          <p id="privacy-consent-desc" className="privacy-consent__desc">
            {t(
              'نستخدم تحليلات بسيطة لفهم استخدام الموقع وتحسين تجربتك.',
              'We use analytics to improve the site.'
            )}
          </p>
        </div>
        <div className="privacy-consent__actions">
          <button type="button" className="privacy-consent__decline" onClick={() => choose('declined')}>
            {t('لا أوافق', 'Decline')}
          </button>
          <button type="button" className="privacy-consent__accept" onClick={() => choose('accepted')}>
            {t('أوافق', 'Accept')}
          </button>
        </div>
      </div>
    </aside>
  );
}
