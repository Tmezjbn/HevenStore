// Asserts seller listing review wiring: status domain, global toggle,
// per-seller override, server-side trigger enforcement, reviewer RPC.
// Run: node scripts/check-listing-review.mjs
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'supabase/migrations');
const mig = readdirSync(migDir)
  .filter((n) => n.endsWith('_seller_listing_review.sql'))
  .sort()
  .at(-1);
assert.ok(mig, 'missing *_seller_listing_review.sql migration');
const sql = readFileSync(join(migDir, mig), 'utf8');

for (const needle of [
  // status domain extended (drift-safe drop + re-add)
  'products_status_check',
  "'pending_review'",
  "'rejected'",
  // global toggle + per-seller override
  "'seller_listing_review'",
  'listing_review_override',
  'profiles_listing_review_override_check',
  // review metadata + queue index
  'review_note',
  'reviewed_by',
  'reviewed_at',
  'products_pending_review_idx',
  // STABLE read-only helper
  'seller_needs_listing_review',
  // server-side enforcement trigger
  'products_seller_listing_review_guard',
  'BEFORE INSERT OR UPDATE ON public.products',
  // reviewer + override RPCs
  'review_product_listing',
  'set_listing_review_override',
]) {
  assert.ok(sql.includes(needle), `migration missing: ${needle}`);
}

// Helper must be STABLE + definer + pinned search_path.
assert.match(
  sql,
  /FUNCTION public\.seller_needs_listing_review\(p_seller uuid\)[\s\S]{0,140}STABLE[\s\S]{0,140}SECURITY DEFINER[\s\S]{0,140}SET search_path = public/,
  'seller_needs_listing_review must be STABLE SECURITY DEFINER SET search_path',
);
// Helper must not write — check only its $$-quoted body.
const helperStart = sql.indexOf('seller_needs_listing_review(p_seller uuid)');
const helperBody = sql.slice(
  sql.indexOf('$$', sql.indexOf('AS $$', helperStart)) + 2,
  sql.indexOf('$$;', helperStart),
);
assert.ok(!/\b(INSERT|UPDATE|DELETE)\b/.test(helperBody), 'helper must be read-only');

// Enforcement: seller coerced to pending_review; internal cols excluded so
// stock/rating/sales writes never re-pend a live listing.
assert.ok(sql.includes("NEW.status := 'pending_review'"), 'trigger must coerce to pending_review');
assert.ok(sql.includes('to_jsonb(NEW)'), 'update path must diff content columns');
for (const col of ['stock', 'rating', 'review_count', 'sales_count']) {
  assert.ok(sql.includes(`'${col}'`), `internal col must be excluded from diff: ${col}`);
}

// Metadata restore must run for EVERY seller write (gated or not) — the
// clear/restore lines must precede the needs-review early-return.
const guardBody = sql.slice(sql.indexOf('products_seller_listing_review_guard()'));
assert.ok(
  guardBody.indexOf('NEW.reviewed_by := OLD.reviewed_by') >
    guardBody.indexOf("IS DISTINCT FROM 'seller'"),
  'metadata restore must run for all seller-role writes',
);
assert.ok(
  guardBody.indexOf('NEW.reviewed_by := OLD.reviewed_by') <
    guardBody.indexOf('seller_needs_listing_review(auth.uid())'),
  'metadata restore must precede the needs-review early-return',
);

// Definer RPCs must self-check caller role in-body, NULL-safe (definer
// bypasses RLS; NULL role must not slip past NOT IN).
const reviewBody = sql.slice(sql.indexOf('review_product_listing('));
assert.match(
  reviewBody,
  /COALESCE\(public\.current_user_role\(\), 'none'\) NOT IN \('owner', 'admin'\)[\s\S]{0,80}RAISE EXCEPTION/,
  'review_product_listing must self-check owner/admin, NULL-safe',
);
assert.match(
  reviewBody,
  /p_approve IS NULL[\s\S]{0,80}RAISE EXCEPTION/,
  'NULL p_approve must be rejected',
);
assert.match(
  reviewBody,
  /NOT p_approve[\s\S]{0,120}RAISE EXCEPTION 'rejection reason required'/,
  'rejection must require a reason',
);
assert.ok(reviewBody.includes('notify_users'), 'review must notify the seller');
const overrideBody = sql.slice(sql.indexOf('set_listing_review_override('));
assert.match(
  overrideBody,
  /COALESCE\(public\.current_user_role\(\), 'none'\) NOT IN \('owner', 'admin'\)[\s\S]{0,80}RAISE EXCEPTION/,
  'set_listing_review_override must self-check owner/admin, NULL-safe',
);
assert.match(overrideBody, /p_mode IS NULL/, 'NULL p_mode must be rejected');

// Helper is caller-scoped (self or staff) so overrides stay non-public.
assert.match(
  helperBody,
  /IS DISTINCT FROM auth\.uid\(\)/,
  'helper must scope lookups to self or staff',
);

// Seller must not self-write the override via profiles_update_own —
// guard_profile_account_status must restore it for non-staff, and
// force_member_role_on_insert must default it on profile insert.
assert.ok(
  sql.includes('NEW.listing_review_override := OLD.listing_review_override'),
  'profile guard must restore listing_review_override for non-staff',
);
assert.ok(
  sql.includes("NEW.listing_review_override := 'default'"),
  'profile insert guard must default listing_review_override',
);

// All three functions must be REVOKEd from PUBLIC/anon.
for (const fn of [
  'seller_needs_listing_review(uuid)',
  'set_listing_review_override(uuid, text)',
  'review_product_listing(uuid, boolean, text)',
]) {
  assert.match(
    sql,
    new RegExp(`REVOKE ALL ON FUNCTION public\\.${fn.replace(/[()]/g, (c) => `\\${c}`)} FROM PUBLIC`),
    `${fn} must be revoked from PUBLIC`,
  );
}

// Public catalog must stay active-only — check the LATEST migration that
// defines products_select_active, not a frozen filename.
const policyFile = readdirSync(migDir)
  .filter((n) => n.endsWith('.sql'))
  .sort()
  .filter((n) =>
    readFileSync(join(migDir, n), 'utf8').includes('CREATE POLICY "products_select_active"'),
  )
  .at(-1);
assert.ok(policyFile, 'no migration defines products_select_active');
assert.match(
  readFileSync(join(migDir, policyFile), 'utf8'),
  /CREATE POLICY "products_select_active"[\s\S]{0,300}status = 'active'/,
  'public catalog policy must remain status=active',
);

// Types carry the new statuses + review metadata + override.
const types = readFileSync(join(root, 'src/types/index.ts'), 'utf8');
assert.match(types, /'pending_review' \| 'rejected'/);
assert.match(types, /review_note\??:\s*string \| null/);
assert.match(types, /listing_review_override\??:\s*'default' \| 'always' \| 'never'/);

// Settings key + parser registered.
const site = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
assert.ok(site.includes("'seller_listing_review'"), 'settings key must be registered');
assert.match(site, /export function parseSellerListingReview/);

// UI wiring: owner toggle, per-seller override select, seller badges/reason,
// staff queue + approve/reject actions.
const settingsPage = readFileSync(
  join(root, 'src/pages/dashboard/SettingsPage.tsx'),
  'utf8',
);
assert.match(settingsPage, /parseSellerListingReview\(form\.seller_listing_review\)/);

const usersPage = readFileSync(join(root, 'src/pages/dashboard/UsersPage.tsx'), 'utf8');
assert.match(usersPage, /set_listing_review_override/);
assert.match(usersPage, /listing_review_override/);

const sellerPage = readFileSync(
  join(root, 'src/pages/dashboard/SellerProductsPage.tsx'),
  'utf8',
);
assert.match(sellerPage, /seller_needs_listing_review/);
assert.match(sellerPage, /pending_review/);
assert.match(sellerPage, /review_note/);

for (const page of ['OwnerProductsPage.tsx', 'AdminProductsPage.tsx']) {
  const src = readFileSync(join(root, 'src/pages/dashboard', page), 'utf8');
  assert.match(src, /review_product_listing/, `${page} must call the review RPC`);
  assert.match(src, /'pending_review'/, `${page} must render pending state`);
  assert.match(src, /pendingReviewCount/, `${page} must show a pending count`);
}

console.log('listing review OK');
