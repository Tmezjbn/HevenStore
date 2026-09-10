/** Public username: lowercase [a-z0-9_]{3,24} */

export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

/** Server + UI: days between username renames (after first free change). */
export const USERNAME_CHANGE_COOLDOWN_DAYS = 14;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidUsername(raw: string): boolean {
  return USERNAME_RE.test(normalizeUsername(raw));
}

/** Login looks like email if it has @ (signup still requires real email). */
export function looksLikeEmail(raw: string): boolean {
  return raw.includes('@');
}

export function sellerPath(seller: { id: string; username?: string | null }): string {
  const u = seller.username?.trim();
  return `/seller/${u || seller.id}`;
}

export function usernameUnlockAt(changedAt: string | null | undefined): Date | null {
  if (!changedAt) return null;
  const t = new Date(changedAt).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(t + USERNAME_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
}

export function isUsernameChangeLocked(
  changedAt: string | null | undefined,
  now = Date.now(),
): boolean {
  const unlock = usernameUnlockAt(changedAt);
  return unlock != null && unlock.getTime() > now;
}
