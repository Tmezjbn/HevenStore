/** After delete, buyer waits before posting again on that product. */
export const REVIEW_REWRITE_COOLDOWN_MS = 60 * 60 * 1000;
/** Anti-spam between submit clicks. */
export const REVIEW_SUBMIT_COOLDOWN_MS = 8_000;

function key(productId: string, userId: string): string {
  return `heven-review-cd:${productId}:${userId}`;
}

export function getReviewCooldownMs(productId: string, userId: string | undefined): number {
  if (!userId || typeof localStorage === 'undefined') return 0;
  try {
    const until = Number(localStorage.getItem(key(productId, userId)) || 0);
    return Math.max(0, until - Date.now());
  } catch {
    return 0;
  }
}

export function armReviewCooldown(
  productId: string,
  userId: string,
  ms = REVIEW_REWRITE_COOLDOWN_MS,
): void {
  try {
    localStorage.setItem(key(productId, userId), String(Date.now() + ms));
  } catch {
    /* private mode */
  }
}

export function formatCooldown(ms: number, ar: boolean): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) {
    return ar ? `${s} ث` : `${s}s`;
  }
  const m = Math.ceil(s / 60);
  return ar ? `${m} د` : `${m}m`;
}
