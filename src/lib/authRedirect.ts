import { hasUnsafeUrlChar } from './safeHref';

/** Same-origin app path only — blocks open redirects via ?next=. */
export function safeAppPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  const next = raw.trim();
  // Backslashes parse as slashes in WHATWG URLs — /\host is an open redirect.
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('://') ||
    next.includes('\\') ||
    /\s/.test(next) ||
    hasUnsafeUrlChar(next)
  ) {
    return fallback;
  }
  return next;
}
