/** ASCII control chars / DEL / C1 — bad actors in any URL or path. */
export function hasUnsafeUrlChar(s: string): boolean {
  return [...s].some((c) => {
    const n = c.codePointAt(0) ?? 0;
    return n <= 0x20 || n === 0x7f || (n >= 0x80 && n <= 0x9f);
  });
}

/**
 * Owner-writable URLs (footer nav / socials).
 * Relative app paths and https/mailto only — other schemes rejected.
 */
export function isSafeHref(raw: string): boolean {
  const href = raw.trim();
  if (!href) return false;
  // Backslash counts as a separator in WHATWG URL parsing — /\host and
  // https:\host are external links wearing a same-origin costume.
  if (href.includes('\\') || /\s/.test(href) || hasUnsafeUrlChar(href)) return false;
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
