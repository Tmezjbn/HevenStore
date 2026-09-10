/**
 * Phase 1–2 audit invariants: purge secret scrubbed + SEC-1..4 migration markers.
 * Run: node scripts/check-audit-sec-phase12.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// OPS-7: never ship a live purge secret
const cron = read('supabase/cron/purge_due_account_deletions.sql');
assert.ok(cron.includes("'<PURGE_CRON_SECRET>'"), 'cron SQL must use <PURGE_CRON_SECRET> placeholder');
assert.ok(!/heven_purge_/i.test(cron), 'cron SQL must not contain heven_purge_ live secret');
assert.ok(!/x-purge-secret',\s*'[^<][^']+'/.test(cron), 'cron SQL must not embed a non-placeholder x-purge-secret');

const mig = read('supabase/migrations/20260720193000_audit_sec_keys_seller_reviews_orders.sql');
for (const needle of [
  'guard_claimed_product_key',
  'CLAIMED_KEY_LOCKED',
  'product_keys_guard_claimed',
  'DROP POLICY IF EXISTS "reviews_update_own"',
  'DROP POLICY IF EXISTS "orders_update"',
  "role = 'seller'",
  'seller_id = auth.uid()',
]) {
  assert.ok(mig.includes(needle), `SEC migration missing: ${needle}`);
}

// Client must not regain direct orders UPDATE / reviews UPDATE
const orderActions = read('src/lib/orderActions.ts');
assert.ok(!/\.from\(\s*'orders'\s*\)\s*\.\s*(update|delete)/.test(orderActions), 'orderActions must not write orders');

const reviewsHook = read('src/hooks/useProductReviews.ts');
assert.ok(!/\.from\(\s*'reviews'\s*\)\s*\.\s*update/.test(reviewsHook), 'reviews hook must not UPDATE reviews');

console.log('audit sec phase 1–2 invariants OK');
