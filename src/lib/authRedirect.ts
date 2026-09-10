/** Same-origin app path only — blocks open redirects via ?next=. */
export function safeAppPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  const next = raw.trim();
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) return fallback;
  return next;
}
