import { useEffect, useState } from 'react';
import { merchMotionShouldCalm, parseMerchMotionMode } from '../lib/siteSettings';
import { useSiteSettings } from './useSiteSettings';

function readPrefersReduced(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Storefront merch FX calm gate: site `merch_motion_mode` + OS prefers-reduced-motion.
 * auto + reduce → calm; always → motion; off → calm.
 */
export function useMerchMotionCalm(): boolean {
  const { settings } = useSiteSettings();
  const mode = parseMerchMotionMode(settings.merch_motion_mode);
  const [prefersReduced, setPrefersReduced] = useState(readPrefersReduced);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return merchMotionShouldCalm(mode, prefersReduced);
}
