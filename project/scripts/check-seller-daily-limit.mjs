import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mig = readFileSync(
  join(root, 'supabase/migrations/20260720153000_seller_daily_product_limit.sql'),
  'utf8',
);
const settings = readFileSync(join(root, 'src/lib/siteSettings.ts'), 'utf8');
const sellerPage = readFileSync(join(root, 'src/pages/dashboard/SellerProductsPage.tsx'), 'utf8');
const settingsPage = readFileSync(join(root, 'src/pages/dashboard/SettingsPage.tsx'), 'utf8');
const editor = readFileSync(join(root, 'src/pages/dashboard/ProductEditorPage.tsx'), 'utf8');

assert.match(mig, /seller_daily_product_limit/);
assert.match(mig, /products_seller_daily_limit_guard/);
assert.match(mig, /RAISE EXCEPTION 'seller_daily_product_limit'/);
assert.match(settings, /seller_daily_product_limit/);
assert.match(settings, /parseSellerDailyProductLimit/);
assert.match(settings, /utcDayStartIso/);
assert.match(sellerPage, /atDailyLimit/);
assert.match(settingsPage, /seller_daily_product_limit/);
assert.match(editor, /seller_daily_product_limit/);

console.log('seller daily limit OK');
