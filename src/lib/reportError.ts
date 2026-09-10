import { trackError } from '@databuddy/sdk/react';
import { shouldTrackAnalytics } from './analyticsConsent';
import { isSupabaseConfigured } from './supabase';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
const SUPABASE_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';

/** Same message+path within window → skip beacon (console still logs). Edge also rate-limits. */
const BEACON_DEDUP_MS = 60_000;
const recentBeacons = new Map<string, number>();

function shouldBeacon(message: string, path: string | undefined): boolean {
  const key = `${message}\0${path ?? ''}`;
  const now = Date.now();
  const prev = recentBeacons.get(key);
  if (prev != null && now - prev < BEACON_DEDUP_MS) return false;
  recentBeacons.set(key, now);
  // ponytail: Map grows with unique errors; ceiling ~session noise. Upgrade = LRU/cap.
  if (recentBeacons.size > 100) {
    const cutoff = now - BEACON_DEDUP_MS;
    for (const [k, t] of recentBeacons) {
      if (t < cutoff) recentBeacons.delete(k);
    }
  }
  return true;
}

/** Staff log via Edge Function — works even when analytics consent is declined. */
function beaconStaffError(
  error: Error,
  extras?: {
    filename?: string;
    lineno?: number;
    colno?: number;
    error_type?: string;
  },
) {
  if (!isSupabaseConfigured || !SUPABASE_URL || !SUPABASE_ANON) return;
  const path = typeof location !== 'undefined' ? location.pathname + location.search : undefined;
  if (!shouldBeacon(error.message || 'Unknown error', path)) return;
  try {
    const body = JSON.stringify({
      message: error.message || 'Unknown error',
      stack: error.stack?.slice(0, 4000),
      path,
      error_type: extras?.error_type ?? error.name,
      filename: extras?.filename,
      lineno: extras?.lineno,
      colno: extras?.colno,
      lang: typeof document !== 'undefined' ? document.documentElement.lang : undefined,
    });
    void fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/client-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON,
      },
      body,
      keepalive: true,
    }).catch(() => {
      /* offline / blocked */
    });
  } catch {
    /* ignore */
  }
}

/** Report a client error: always console + staff beacon; Databuddy only with consent. */
export function reportError(
  err: unknown,
  extras?: {
    filename?: string;
    lineno?: number;
    colno?: number;
    error_type?: string;
    [key: string]: string | number | boolean | null | undefined;
  },
) {
  const error = err instanceof Error ? err : new Error(String(err));
  console.error('[heven]', error, extras);

  beaconStaffError(error, extras);

  if (!shouldTrackAnalytics()) return;
  try {
    trackError(error.message || 'Unknown error', {
      stack: error.stack?.slice(0, 4000),
      error_type: extras?.error_type ?? error.name,
      filename: extras?.filename,
      lineno: extras?.lineno,
      colno: extras?.colno,
      ...extras,
    });
  } catch {
    /* tracker not ready */
  }
}

/** One-shot window error / unhandledrejection hooks. */
export function installGlobalErrorHandlers() {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __hevenErrorsInstalled?: boolean };
  if (w.__hevenErrorsInstalled) return;
  w.__hevenErrorsInstalled = true;

  window.addEventListener('error', (event) => {
    reportError(event.error ?? event.message, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error_type: 'window.onerror',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, { error_type: 'unhandledrejection' });
  });
}
