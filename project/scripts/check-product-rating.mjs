/** Mirrors src/lib/productRating.ts — fails if soft/seed math drifts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const RATING_PRIOR_WEIGHT = 19;

function clampSeed(n) {
  if (!Number.isFinite(n)) return 5;
  return Math.min(5, Math.max(1, Math.round(n * 100) / 100));
}

function softProductRating(seed, reviewRatings, priorWeight = RATING_PRIOR_WEIGHT) {
  const s = clampSeed(seed);
  if (reviewRatings.length === 0) return s;
  const sum = reviewRatings.reduce((a, b) => a + b, 0);
  const n = reviewRatings.length;
  const w = Math.max(0, priorWeight);
  return Math.round(((w * s + sum) / (w + n)) * 100) / 100;
}

function starFillAmount(rating, index) {
  if (!Number.isFinite(rating)) return 0;
  const v = rating - index;
  if (v >= 1) return 1;
  if (v <= 0) return 0;
  return Math.round(v * 100) / 100;
}

assert.equal(softProductRating(5, []), 5);
assert.equal(softProductRating(4.5, []), 4.5);
// seed 5 + one 3★ → 4.9 (not 3)
assert.equal(softProductRating(5, [3]), 4.9);
assert.equal(softProductRating(5, [5]), 5);
assert.equal(starFillAmount(4.9, 4), 0.9);
assert.equal(starFillAmount(4.9, 3), 1);
assert.equal(clampSeed(0), 1);
assert.equal(clampSeed(9), 5);

function effectiveProductRating(p) {
  if ((p.review_count ?? 0) === 0) {
    return clampSeed(p.rating_seed ?? (p.rating > 0 ? p.rating : 5));
  }
  return p.rating;
}
assert.equal(effectiveProductRating({ rating: 0, review_count: 0 }), 5);
assert.equal(effectiveProductRating({ rating: 4.9, review_count: 1 }), 4.9);

const lib = readFileSync(join(root, 'src/lib/productRating.ts'), 'utf8');
assert.match(lib, /softProductRating|displayProductRating/);
assert.match(lib, /RATING_PRIOR_WEIGHT\s*=\s*19/);
assert.match(lib, /starFillAmount/);
assert.match(lib, /clampSeed/);
assert.match(lib, /effectiveProductRating/);

const sql = readFileSync(
  join(root, 'supabase/migrations/20260718160000_soft_product_rating.sql'),
  'utf8',
);
assert.match(sql, /prior numeric := 19/);
assert.match(sql, /ROUND\(\(prior \* seed \+ sum_r\) \/ \(prior \+ n\), 2\)/);

const starsUi = readFileSync(join(root, 'src/components/ui/RatingStars.tsx'), 'utf8');
assert.match(starsUi, /starFillAmount/);

const seedSql = readFileSync(
  join(root, 'supabase/migrations/20260712200000_product_rating_seed.sql'),
  'utf8',
);
assert.match(seedSql, /rating_seed/);

const hook = readFileSync(join(root, 'src/hooks/useProductReviews.ts'), 'utf8');
assert.match(hook, /is_verified_purchase:\s*true/);
assert.match(hook, /get_review_authors_public/);

const ui = readFileSync(join(root, 'src/components/product/ProductReviews.tsx'), 'utf8');
assert.match(ui, /RatingStars/);
assert.doesNotMatch(ui, /Edit your review|عدّل تقييمك/);

const pdp = readFileSync(join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8');
assert.match(pdp, /RatingStars/);

console.log('check-product-rating: ok');
