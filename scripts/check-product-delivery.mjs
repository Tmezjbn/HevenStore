/**
 * Delivery preset helpers stay usable without a TS loader.
 * Run: node scripts/check-product-delivery.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/lib/productDelivery.ts'), 'utf8');

assert.ok(src.includes("'instant'"), 'instant preset');
assert.ok(src.includes("'custom'"), 'custom preset');
assert.ok(src.includes('cartDeliveryLabel'), 'cart aggregate');
assert.ok(src.includes('productDeliveryLabel'), 'per-product label');
assert.ok(src.includes('productDeliveryIsInstant'), 'instant helper');

const mig = readFileSync(
  join(root, 'supabase/migrations/20260712140000_products_delivery_label.sql'),
  'utf8',
);
assert.ok(mig.includes('delivery_preset'), 'migration column');
assert.ok(mig.includes('delivery_custom_en'), 'custom en');

// UX-1: PDP reuses delivery helpers + Cart trust vocabulary under Add-to-Cart.
const pdp = readFileSync(join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8');
assert.match(pdp, /productDeliveryLabel/);
assert.match(pdp, /productDeliveryIsInstant/);
assert.match(pdp, /Instant delivery after payment/);
assert.match(pdp, /Secure payment via Polar/);
assert.match(pdp, /Help & support/);
assert.match(pdp, /\bZap\b/);
assert.match(pdp, /\bShield\b/);
assert.match(pdp, /lucide-react/);

console.log('product_delivery ok');
