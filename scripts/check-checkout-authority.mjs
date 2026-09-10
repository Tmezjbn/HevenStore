// Phase-1 invariant: money tables are server-authoritative.
// Fails if client code regains direct writes to orders / order_items /
// coupon_usages, or if the checkout RPCs disappear from migrations.
// Run: node scripts/check-checkout-authority.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

const forbidden = /from\(\s*'(orders|order_items|coupon_usages)'\s*\)\s*\.\s*(insert|update|upsert|delete)/;
const offenders = [];
for (const file of walk(join(root, 'src'))) {
  if (forbidden.test(readFileSync(file, 'utf8'))) offenders.push(file);
}
assert.deepEqual(offenders, [], `client writes to money tables found in:\n${offenders.join('\n')}`);

const migration = readFileSync(
  join(root, 'supabase', 'migrations', '20260711100000_checkout_server_authority.sql'),
  'utf8',
);
for (const required of [
  'CREATE OR REPLACE FUNCTION public.create_pending_order',
  'CREATE OR REPLACE FUNCTION public.finalize_paid_order',
  'FOR UPDATE SKIP LOCKED',
  `DROP POLICY IF EXISTS "orders_insert_own"`,
  `DROP POLICY IF EXISTS "order_items_insert"`,
  `DROP POLICY IF EXISTS "coupon_usages_insert"`,
  'GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid, bigint) TO service_role',
]) {
  assert.ok(migration.includes(required), `migration missing: ${required}`);
}

// finalize must never be callable by browsers.
assert.ok(
  migration.includes('REVOKE ALL ON FUNCTION public.finalize_paid_order(uuid, bigint) FROM anon, authenticated'),
  'finalize_paid_order must be revoked from anon/authenticated',
);

// Phase 2: profiles access control.
const profilesMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260711110000_profiles_access_control.sql'),
  'utf8',
);
for (const required of [
  'BEFORE INSERT ON public.profiles',
  "NEW.role := 'member'",
  'public.current_user_role()', // avoids profiles-policy self-recursion
]) {
  assert.ok(profilesMig.includes(required), `profiles migration missing: ${required}`);
}
assert.ok(
  !/USING\s*\(\s*true\s*\)/.test(profilesMig),
  'profiles_select must not be USING(true)',
);

const layout = readFileSync(join(root, 'src', 'layouts', 'DashboardLayout.tsx'), 'utf8');
assert.ok(
  layout.includes('routeRoles') && layout.includes('<Navigate to="/dashboard" replace />'),
  'DashboardLayout must guard routes by role',
);

// Phase 3: fulfillment integrity.
const finalizeMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260711120000_finalize_manual_stock.sql'),
  'utf8',
);
for (const required of [
  'GREATEST(0, stock - v_item.quantity)', // manual stock decrements on paid
  'FOR UPDATE SKIP LOCKED',
  'REVOKE ALL ON FUNCTION public.finalize_paid_order(uuid, bigint) FROM anon, authenticated',
]) {
  assert.ok(finalizeMig.includes(required), `finalize migration missing: ${required}`);
}

// Latest create_pending_order (badges migration supersedes the phase-1 version).
const badgesMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260711170000_profile_badges_deletion.sql'),
  'utf8',
);
for (const required of [
  'CREATE OR REPLACE FUNCTION public.create_pending_order',
  'ACCOUNT_UNAVAILABLE', // inactive accounts cannot order
  'COUPON_BADGE', // badge-gated coupons enforced server-side
]) {
  assert.ok(badgesMig.includes(required), `badges migration missing: ${required}`);
}

const successPage = readFileSync(join(root, 'src', 'pages', 'CheckoutSuccessPage.tsx'), 'utf8');
assert.ok(
  !/if \(!orderId\) \{\s*setState\('paid'\)/.test(successPage),
  'success page must not show paid without an order_id',
);
for (const state of ["'missing'", "'failed'"]) {
  assert.ok(successPage.includes(`setState(${state})`), `success page missing ${state} state`);
}
// FUNC-1: success page removes purchased ids; never blank-wipe cart on paid.
assert.ok(
  !/status === 'paid'[\s\S]{0,200}useCartStore\.getState\(\)\.clearCart\(\)/.test(successPage),
  'CheckoutSuccessPage must not blank-wipe cart on paid',
);
assert.ok(
  successPage.includes('removeItem') && successPage.includes('product_id'),
  'CheckoutSuccessPage must remove purchased product_ids from cart',
);

// Audit P1: account-status guard + coupon cap at finalize + webhook retries
const auditP1 = readFileSync(
  join(root, 'supabase', 'migrations', '20260712160000_audit_p1_guards.sql'),
  'utf8',
);
for (const required of [
  'guard_profile_account_status',
  'NEW.is_active := OLD.is_active',
  'COUPON_CAP',
  'FOR UPDATE',
  'DROP TRIGGER IF EXISTS on_order_paid ON public.orders',
  'SET search_path = public',
]) {
  assert.ok(auditP1.includes(required), `audit P1 migration missing: ${required}`);
}

const webhook = readFileSync(join(root, 'supabase', 'functions', 'polar-webhook', 'index.ts'), 'utf8');
assert.ok(webhook.includes("status: 500"), 'polar-webhook must return 500 so Polar retries finalize failures');
assert.ok(webhook.includes("'retry'"), 'polar-webhook must distinguish retry vs terminal outcomes');
assert.ok(
  !/await markOrderPaid\([\s\S]*?\);\s*return new Response\('ok', \{ status: 200 \}\)/.test(webhook),
  'polar-webhook must not always 200 after markOrderPaid',
);
assert.ok(
  webhook.includes('paid event missing amount') || webhook.includes('getPaidCents(data)'),
  'polar-webhook must gate finalize on paid cents (SEC-6)',
);
assert.ok(
  /paidCents\s*==\s*null|paidCents\s*===\s*null/.test(webhook),
  'polar-webhook must refuse finalize when paid cents is null',
);

const checkoutFn = readFileSync(join(root, 'supabase', 'functions', 'polar-checkout', 'index.ts'), 'utf8');
assert.ok(!checkoutFn.includes("Access-Control-Allow-Origin': '*'"), 'polar-checkout must not use CORS *');
assert.ok(checkoutFn.includes('corsHeaders'), 'polar-checkout must allowlist Origin via SITE_URL');

const analyticsFn = readFileSync(join(root, 'supabase', 'functions', 'databuddy-analytics', 'index.ts'), 'utf8');
assert.ok(!analyticsFn.includes("Access-Control-Allow-Origin': '*'"), 'databuddy-analytics must not use CORS *');
assert.ok(analyticsFn.includes('FEATURE_UNAVAILABLE'), 'databuddy-analytics must degrade when plan gates error queries');
assert.ok(analyticsFn.includes('CORE_QUERY_TYPES'), 'databuddy-analytics must retry without paid query types');

const staleCleanup = readFileSync(
  join(root, 'supabase', 'migrations', '20260712180000_cleanup_stale_pending_orders.sql'),
  'utf8',
);
assert.ok(staleCleanup.includes('cleanup_stale_pending_orders'), 'stale pending cleanup migration missing');

// FUNC-1: pending orders with a live Polar session are superseded, never deleted —
// a late payment must always find its order row.
const supersedeMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714270000_pending_supersede.sql'),
  'utf8',
);
for (const required of [
  'CREATE OR REPLACE FUNCTION public.create_pending_order',
  'CREATE OR REPLACE FUNCTION public.cleanup_stale_pending_orders',
  'polar_checkout_id IS NOT NULL',
  'polar_checkout_id IS NULL',
]) {
  assert.ok(supersedeMig.includes(required), `pending-supersede migration missing: ${required}`);
}
assert.ok(
  !/DELETE FROM public\.orders\s+WHERE user_id = v_user AND status = 'pending';/.test(supersedeMig),
  'create_pending_order must not unconditionally delete pending orders',
);
assert.ok(
  /DELETE FROM public\.orders\s+WHERE user_id = v_user AND status = 'pending' AND polar_checkout_id IS NULL/.test(supersedeMig),
  'create_pending_order may only delete sessionless pending drafts',
);
assert.ok(webhook.includes('ORPHAN_PAID_RECEIPT'), 'polar-webhook must log ORPHAN_PAID_RECEIPT on not_found');

// SEC-H1/H3 + FUNC-2/4: paid = webhook only, no direct deletes, oversell guard, owner coupons.
const hardeningMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714280000_orders_coupons_hardening.sql'),
  'utf8',
);
for (const required of [
  'PAID_VIA_WEBHOOK_ONLY',
  'BEFORE UPDATE ON public.orders',
  'DROP POLICY IF EXISTS "orders_delete" ON public.orders',
  'DROP POLICY IF EXISTS "order_items_delete" ON public.order_items',
  'AND stock >= v_item.quantity', // conditional decrement, not GREATEST(0, ...)
  'STOCK_SHORTFALL',
  "public.current_user_role() IN ('owner', 'admin')", // owner manages coupons
  'GRANT EXECUTE ON FUNCTION public.finalize_paid_order(uuid, bigint) TO service_role',
]) {
  assert.ok(hardeningMig.includes(required), `hardening migration missing: ${required}`);
}
assert.ok(
  !hardeningMig.includes('GREATEST(0, stock - v_item.quantity)'),
  'latest finalize must not use unconditional GREATEST stock decrement',
);

const ordersPage = readFileSync(join(root, 'src', 'pages', 'dashboard', 'OrdersPage.tsx'), 'utf8');
assert.ok(ordersPage.includes('KEY_SHORTFALL'), 'OrdersPage must surface KEY_SHORTFALL attention');
assert.ok(ordersPage.includes('STOCK_SHORTFALL'), 'OrdersPage must surface STOCK_SHORTFALL attention');

const finalizeSales = readFileSync(
  join(root, 'supabase', 'migrations', '20260714300000_finalize_coupon_expiry_sales_count.sql'),
  'utf8',
);
assert.ok(finalizeSales.includes('sales_count'), 'finalize must increment sales_count');
assert.ok(finalizeSales.includes('COUPON_EXPIRED'), 'finalize must re-check coupon expiry');
assert.ok(finalizeSales.includes('expires_at < now()'), 'finalize must compare coupon expires_at');
assert.ok(
  !finalizeSales.includes('deliver manually or refund'),
  'finalize notes must not promise in-site refunds',
);

const avatarsMin = readFileSync(
  join(root, 'supabase', 'migrations', '20260714360000_avatars_coupons_min_amount.sql'),
  'utf8',
);
for (const required of [
  'avatars_staff_insert',
  'DROP POLICY IF EXISTS "avatars_insert_own"',
  'coupons_discount_value_check',
  'AMOUNT_TOO_LOW',
  'v_total < 0.50',
]) {
  assert.ok(avatarsMin.includes(required), `avatars/coupons/min-amount migration missing: ${required}`);
}
assert.ok(ordersPage.includes('orderNeedsAttention'), 'OrdersPage must flag finalize exceptions');

const login = readFileSync(join(root, 'src', 'pages', 'auth', 'LoginPage.tsx'), 'utf8');
assert.ok(login.includes('safeAppPath') && login.includes('next'), 'LoginPage must honor ?next=');

const startPay = readFileSync(join(root, 'src', 'lib', 'startPolarCheckout.ts'), 'utf8');
assert.ok(startPay.includes("create_pending_order"), 'startPolarCheckout must use create_pending_order RPC');
assert.ok(startPay.includes('polar-checkout'), 'startPolarCheckout must invoke polar-checkout');
assert.ok(!startPay.includes(".from('orders')"), 'startPolarCheckout must not write orders client-side');
assert.ok(startPay.includes('AMOUNT_TOO_LOW'), 'startPolarCheckout must map AMOUNT_TOO_LOW');

const cartPage = readFileSync(join(root, 'src', 'pages', 'CartPage.tsx'), 'utf8');
assert.ok(cartPage.includes('startPolarCheckout'), 'CartPage must start Polar pay');
assert.ok(cartPage.includes('Complete Payment'), 'CartPage must label Complete Payment');
assert.ok(cartPage.includes('Sign in to pay'), 'CartPage must label guest pay CTA');
assert.ok(cartPage.includes('/auth/login?next=/cart'), 'CartPage login must return to cart');
assert.ok(cartPage.includes('validateCoupon'), 'CartPage must revalidate coupon at pay');
assert.ok(!cartPage.includes('to="/checkout"'), 'CartPage must not link to /checkout');

const orderCancelMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714250000_order_cancel_delete.sql'),
  'utf8',
);
assert.ok(orderCancelMig.includes('CREATE OR REPLACE FUNCTION public.cancel_order'), 'cancel_order RPC missing');
assert.ok(orderCancelMig.includes('CREATE OR REPLACE FUNCTION public.delete_order'), 'delete_order RPC missing');
assert.ok(orderCancelMig.includes('SECURITY DEFINER'), 'order cancel/delete must be SECURITY DEFINER');

const keyDetailsMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714260000_product_keys_details.sql'),
  'utf8',
);
assert.ok(keyDetailsMig.includes('product_keys'), 'product_keys details migration missing');
assert.ok(keyDetailsMig.includes('key_units jsonb'), 'get_order_fulfillment must expose key_units');
assert.ok(keyDetailsMig.includes('ADD COLUMN IF NOT EXISTS details'), 'product_keys.details column missing');

const orderActions = readFileSync(join(root, 'src', 'lib', 'orderActions.ts'), 'utf8');
assert.ok(orderActions.includes("rpc('cancel_order'"), 'orderActions must call cancel_order RPC');
assert.ok(orderActions.includes("rpc('delete_order'"), 'orderActions must call delete_order RPC');
assert.ok(!/\.from\(\s*'orders'\s*\)\s*\.\s*(update|delete)/.test(orderActions), 'orderActions must not write orders client-side');

const dashOrdersPage = readFileSync(join(root, 'src', 'pages', 'dashboard', 'OrdersPage.tsx'), 'utf8');
assert.ok(dashOrdersPage.includes('cancelOrder'), 'OrdersPage must use cancelOrder');
assert.ok(dashOrdersPage.includes('deleteOrder'), 'OrdersPage must use deleteOrder');
assert.ok(!/\.from\(\s*'orders'\s*\)\s*\.\s*(update|delete)/.test(dashOrdersPage), 'OrdersPage must not write orders client-side');

const appRoutes = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
assert.ok(appRoutes.includes('Navigate to="/cart"'), '/checkout must redirect to /cart');
assert.ok(
  appRoutes.includes('/checkout/success') || appRoutes.includes("'checkout/success'") || appRoutes.includes('"checkout/success"'),
  'success route must remain',
);
assert.ok(!appRoutes.includes('CheckoutPage'), 'CheckoutPage route must be gone');

const rateMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714440000_rpc_rate_limits.sql'),
  'utf8',
);
for (const required of [
  'check_rpc_rate',
  'rpc_rate_buckets',
  'RATE_LIMITED',
  'create_pending_order',
  'resolve_login_email',
  'username_taken',
]) {
  assert.ok(rateMig.includes(required), `rate-limit migration missing: ${required}`);
}
assert.ok(startPay.includes('RATE_LIMITED'), 'startPolarCheckout must map RATE_LIMITED');
assert.ok(login.includes('RATE_LIMITED'), 'LoginPage must handle resolve_login_email rate limit');

// 2026-07-20 audit Phase 2: claimed keys / seller_id / reviews / no orders UPDATE.
const auditSecMig = readFileSync(
  join(root, 'supabase', 'migrations', '20260720193000_audit_sec_keys_seller_reviews_orders.sql'),
  'utf8',
);
for (const required of [
  'guard_claimed_product_key',
  'CLAIMED_KEY_LOCKED',
  'product_keys_guard_claimed',
  'DROP POLICY IF EXISTS "reviews_update_own"',
  'DROP POLICY IF EXISTS "orders_update"',
  'seller_id IS NULL OR seller_id = auth.uid()',
]) {
  assert.ok(auditSecMig.includes(required), `audit SEC migration missing: ${required}`);
}

// 2026-07-20 audit Phase 7: coupon seats + storage path + notification read-only.
const auditP7 = readFileSync(
  join(root, 'supabase', 'migrations', '20260720200000_audit_sec_phase7_harden.sql'),
  'utf8',
);
for (const required of [
  'FOR UPDATE',
  'v_pending_seats',
  'COUPON_LIMIT',
  "(storage.foldername(name))[1] = auth.uid()::text",
  "(storage.foldername(name))[2] = auth.uid()::text",
  'guard_notification_client_update',
  'NOTIFICATION_READ_ONLY',
  "coupon_usages_select",
  "current_user_role() IN ('owner', 'admin', 'moderator')",
]) {
  assert.ok(auditP7.includes(required), `audit Phase 7 migration missing: ${required}`);
}

const supabaseClient = readFileSync(join(root, 'src', 'lib', 'supabase.ts'), 'utf8');
assert.ok(
  supabaseClient.includes('SEC-5') && supabaseClient.includes('localStorage'),
  'supabase client must document SEC-5 localStorage acceptance',
);

// FUNC-2: signOut clears cart + wishlist (shared-device leak).
const authStore = readFileSync(join(root, 'src', 'stores', 'authStore.ts'), 'utf8');
assert.ok(authStore.includes('useCartStore'), 'authStore must import cart store');
assert.ok(authStore.includes('useWishlistStore'), 'authStore must import wishlist store');
assert.ok(
  authStore.includes('clearLocalCommerce') &&
    /clearLocalCommerce\(\)[\s\S]*?clearCart\(\)/.test(authStore) &&
    /signOut:[\s\S]*?clearLocalCommerce\(\)/.test(authStore),
  'signOut must clear cart + wishlist via clearLocalCommerce',
);

console.log('checkout authority + profiles access + fulfillment invariants OK');
