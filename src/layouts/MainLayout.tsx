import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import BackToTop from '../components/ui/BackToTop';
import PrivacyConsentBanner from '../components/privacy/PrivacyConsentBanner';
import SiteAtmosphere from '../components/layout/SiteAtmosphere';
import ErrorBoundary from '../components/ErrorBoundary';
import { useI18n } from '../lib/i18n';
import { installStorefrontWheelSmooth } from '../lib/smoothScroll';

export default function MainLayout() {
  const { t } = useI18n();
  // Blink: CSS scroll-behavior skips wheel — light document lerp (Firefox keeps native).
  useEffect(() => installStorefrontWheelSmooth(), []);
  // No overflow-x on shell — Blink flattens perspective/3D under non-visible overflow.
  return (
    <div className="relative min-h-screen bg-base-100 flex flex-col">
      <a
        href="#main-content"
        className="absolute start-4 top-3 z-[100] -translate-y-[200%] focus:translate-y-0 rounded-field bg-primary px-4 py-2 text-sm font-semibold text-primary-content shadow-lg outline-none ring-2 ring-primary ring-offset-2 ring-offset-base-100 transition-transform"
      >
        {t('تخطَّ إلى المحتوى', 'Skip to content')}
      </a>
      <SiteAtmosphere />
      {/* No z-10 wrapper — that made a stacking context under pdp-fx--over (z-20),
          so footer/drawer chrome flags could never cover atmosphere. */}
      <Navbar />
      <main id="main-content" className="relative z-10 flex-1" tabIndex={-1}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Footer />
      <BackToTop />
      <PrivacyConsentBanner />
    </div>
  );
}
