/**
 * Username login + seller slug wiring.
 * Run: node scripts/check-usernames.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function src(file) {
  return readFileSync(join(root, file), 'utf8');
}

function mustInclude(file, needle) {
  assert.ok(src(file).includes(needle), `${file} missing ${JSON.stringify(needle)}`);
}

const migration = 'supabase/migrations/20260714120000_profile_usernames.sql';
mustInclude(migration, 'username');
mustInclude(migration, 'username_taken');
mustInclude(migration, 'resolve_login_email');
mustInclude(migration, 'get_seller_public');
mustInclude(migration, 'profiles_username_unique');

mustInclude('src/lib/username.ts', 'sellerPath');
mustInclude('src/lib/username.ts', 'isValidUsername');
mustInclude('src/lib/username.ts', 'USERNAME_CHANGE_COOLDOWN_DAYS');
mustInclude('src/lib/username.ts', 'isUsernameChangeLocked');
mustInclude('src/pages/auth/RegisterPage.tsx', 'username');
mustInclude('src/pages/auth/LoginPage.tsx', 'resolve_login_email');
mustInclude('src/pages/auth/LoginPage.tsx', 'Invalid email, username, or password.');
assert.ok(
  !src('src/pages/auth/LoginPage.tsx').includes('Could not find that account'),
  'LoginPage must not leak account existence via distinct copy',
);
mustInclude('src/lib/authErrors.ts', 'Invalid email, username, or password.');
mustInclude('src/stores/authStore.ts', 'profile: null, loading: false');
mustInclude('src/pages/HomePage.tsx', 'dir={contentDir}');
mustInclude('src/pages/GamesPage.tsx', 'dir={contentDir}');
mustInclude('src/pages/ProductDetailPage.tsx', 'dir={contentDir}');
mustInclude('src/pages/SellerPage.tsx', 'dir={contentDir}');

const finalizeSales = 'supabase/migrations/20260714300000_finalize_coupon_expiry_sales_count.sql';
mustInclude(finalizeSales, 'sales_count');
mustInclude(finalizeSales, 'COUPON_EXPIRED');
mustInclude(finalizeSales, 'expires_at < now()');

mustInclude('src/pages/SellerPage.tsx', 'p_key');
mustInclude('src/pages/SellerPage.tsx', 'UserAvatar');
mustInclude('src/pages/SellerPage.tsx', 'roleLabel');
mustInclude('src/pages/ProductDetailPage.tsx', 'sellerPath');
mustInclude('src/hooks/useCatalog.ts', 'p_key');
mustInclude('src/hooks/useCatalog.ts', 'get_sellers_public');
mustInclude(
  'supabase/migrations/20260714330000_get_sellers_public_batch.sql',
  'get_sellers_public',
);
assert.ok(
  !/Promise\.all\(\s*ids\.map/.test(src('src/hooks/useCatalog.ts')),
  'attachPublicSellers must not N+1 map over seller ids',
);
// Single-product PDP still uses get_seller_public by key:
mustInclude('src/hooks/useCatalog.ts', 'get_seller_public');
mustInclude('src/types/index.ts', 'username');
mustInclude('src/pages/HomePage.tsx', 'useLatestProducts(48)');
assert.ok(
  !src('src/pages/HomePage.tsx').includes('useLatestProducts(12)'),
  'HomePage must not double-fetch latest (12 + 48)',
);
mustInclude('src/pages/dashboard/ProfilePage.tsx', 'username_changed_at');

const cooldown = 'supabase/migrations/20260714130000_username_change_cooldown.sql';
mustInclude(cooldown, 'username_changed_at');
mustInclude(cooldown, 'USERNAME_COOLDOWN');
mustInclude(cooldown, 'enforce_username_change_cooldown');

mustInclude(
  'supabase/migrations/20260714400000_cooldown_search_path_catalog_idx.sql',
  'SET search_path = public',
);
mustInclude(
  'supabase/migrations/20260714400000_cooldown_search_path_catalog_idx.sql',
  'products_status_product_type_idx',
);

const sellerRole = 'supabase/migrations/20260714140000_seller_public_role.sql';
mustInclude(sellerRole, 'get_seller_public');
mustInclude(sellerRole, 'role');

console.log('check-usernames: ok');
