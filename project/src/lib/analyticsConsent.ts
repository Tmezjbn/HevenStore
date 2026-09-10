/**
 * Visitor analytics consent (localStorage).
 * Decline = Databuddy off only. CoolLabs fonts / Polar / Supabase / other infra are never gated.
 */

const KEY = 'heven-analytics-consent';
const EVENT = 'heven-analytics-consent';
const COOLDOWN_KEY = 'heven-analytics-consent-cooldown';
/** Prefs toggle: wait this long between accept ↔ decline flips. */
export const ANALYTICS_CONSENT_COOLDOWN_MS = 10 * 1000;

export type AnalyticsConsent = 'accepted' | 'declined';

/** Owner can turn the prompt off in Website Builder. Banner off ≠ auto-track. */
let bannerRequired = true;

export function setPrivacyBannerRequired(required: boolean) {
  bannerRequired = required;
}

export function isPrivacyBannerRequired() {
  return bannerRequired;
}

export function getAnalyticsConsent(): AnalyticsConsent | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'accepted' || v === 'declined') return v;
  } catch {
    /* private mode */
  }
  return null;
}

/** Ms left before the prefs toggle can flip again (0 = ready). */
export function getAnalyticsConsentCooldownMs(): number {
  try {
    const until = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
    if (!Number.isFinite(until) || until <= 0) return 0;
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

export function isAnalyticsConsentOnCooldown(): boolean {
  return getAnalyticsConsentCooldownMs() > 0;
}

function armAnalyticsConsentCooldown() {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now() + ANALYTICS_CONSENT_COOLDOWN_MS));
  } catch {
    /* ignore */
  }
}

/**
 * Persist consent. When `opts.cooldown` is true (prefs toggle), arms a 10s lock
 * and no-ops if still cooling down.
 */
export function setAnalyticsConsent(
  value: AnalyticsConsent,
  opts?: { cooldown?: boolean }
): boolean {
  if (opts?.cooldown && isAnalyticsConsentOnCooldown()) return false;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
  if (opts?.cooldown) armAnalyticsConsentCooldown();
  window.dispatchEvent(new Event(EVENT));
  return true;
}

export function onAnalyticsConsentChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** Decline blocks. Accept allows. Undecided never tracks (banner off ≠ opt-in). */
export function shouldTrackAnalytics(): boolean {
  return getAnalyticsConsent() === 'accepted';
}

export function shouldShowPrivacyBanner(): boolean {
  return bannerRequired && getAnalyticsConsent() === null;
}

export const DATABUDDY_CLIENT_ID =
  (import.meta.env.VITE_DATABUDDY_CLIENT_ID as string | undefined) ||
  '1b85bcc6-3f17-4b20-80ad-c87d9dfd4978';
export const DATABUDDY_SCRIPT_URL = 'https://cdn.databuddy.cc/databuddy.js';

export function ensureDatabuddyScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-heven-databuddy]')) return;
  const s = document.createElement('script');
  s.src = DATABUDDY_SCRIPT_URL;
  s.async = true;
  s.dataset.hevenDatabuddy = '1';
  s.dataset.clientId = DATABUDDY_CLIENT_ID;
  s.dataset.trackWebVitals = 'true';
  s.dataset.trackErrors = 'true';
  s.dataset.trackOutgoingLinks = 'true';
  s.dataset.trackPerformance = 'true';
  document.head.appendChild(s);
}

export function removeDatabuddyScript() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('script[data-heven-databuddy]').forEach((el) => el.remove());
}
