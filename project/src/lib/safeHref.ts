/**
 * Owner-writable URLs (footer nav / socials).
 * Relative app paths and https/mailto only — other schemes rejected.
 */
export function isSafeHref(raw: string): boolean {
  const href = raw.trim();
  if (!href) return false;
  if (href.startsWith('/') && !href.startsWith('//')) return true;
  if (/^https:\/\//i.test(href)) return true;
  if (/^mailto:[^\s]+$/i.test(href)) return true;
  return false;
}

/** Returns trimmed href or null when unsafe. */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  return isSafeHref(href) ? href : null;
}
