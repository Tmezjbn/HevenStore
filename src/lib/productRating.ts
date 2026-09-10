/**
 * Soft product score: Bayesian pull toward seed so early low reviews
 * barely move the dial. priorWeight=19 → seed 5 + one 3★ ≈ 4.9.
 */
export const RATING_PRIOR_WEIGHT = 19;

export function clampSeed(n: number): number {
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n * 100) / 100));
}

/** Soft average used for storefront `products.rating`. */
export function softProductRating(
  seed: number,
  reviewRatings: number[],
  priorWeight = RATING_PRIOR_WEIGHT,
): number {
  const s = clampSeed(seed);
  if (reviewRatings.length === 0) return s;
  const sum = reviewRatings.reduce((a, b) => a + b, 0);
  const n = reviewRatings.length;
  const w = Math.max(0, priorWeight);
  return Math.round(((w * s + sum) / (w + n)) * 100) / 100;
}

/** @deprecated alias — same soft blend as DB. */
export function displayProductRating(seed: number, reviewRatings: number[]): number {
  return softProductRating(seed, reviewRatings);
}

/** Prefer DB rating; unreviewed products with stale 0 still show seed/5. */
export function effectiveProductRating(p: {
  rating: number;
  review_count: number;
  rating_seed?: number | null;
}): number {
  if ((p.review_count ?? 0) === 0) {
    return clampSeed(p.rating_seed ?? (p.rating > 0 ? p.rating : 5));
  }
  return p.rating;
}

/** Fill amount for star index 0..4 (0 empty → 1 full). 4.9 → last star 0.9. */
export function starFillAmount(rating: number, index: number): number {
  if (!Number.isFinite(rating)) return 0;
  const v = rating - index;
  if (v >= 1) return 1;
  if (v <= 0) return 0;
  return Math.round(v * 100) / 100;
}
