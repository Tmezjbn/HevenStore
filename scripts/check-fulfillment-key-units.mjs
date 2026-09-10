// Per-key details: migration + display coalesce + editor wiring.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

const mig = readFileSync(
  join(root, 'supabase', 'migrations', '20260714260000_product_keys_details.sql'),
  'utf8',
);
assert.ok(mig.includes('ADD COLUMN IF NOT EXISTS details'), 'migration must add product_keys.details');
assert.ok(mig.includes('key_units jsonb'), 'get_order_fulfillment must return key_units');
assert.ok(mig.includes('NULLIF(btrim(k.details), \'\')'), 'key_units details must null blank overrides');
assert.ok(mig.includes('DROP FUNCTION IF EXISTS public.get_order_fulfillment'), 'must DROP before return-shape change');

const ful = readFileSync(join(root, 'src', 'lib', 'fulfillment.ts'), 'utf8');
assert.ok(ful.includes('export function parseKeyUnits'), 'parseKeyUnits missing');
assert.ok(ful.includes('keyUnits'), 'fulfillmentDisplay must accept keyUnits');
assert.ok(ful.includes("u.details?.trim() ? u.details : content"), 'per-key coalesce missing');

const editor = readFileSync(join(root, 'src', 'pages', 'dashboard', 'ProductEditorPage.tsx'), 'utf8');
assert.ok(editor.includes('keyOverrides'), 'ProductEditor must track keyOverrides');
assert.ok(editor.includes("select('id, content, details, claimed_at')"), 'ProductEditor must load key details');
assert.ok(editor.includes('Delivery content'), 'ProductEditor must label default delivery');

const success = readFileSync(join(root, 'src', 'pages', 'CheckoutSuccessPage.tsx'), 'utf8');
assert.ok(success.includes('parseKeyUnits'), 'CheckoutSuccess must use parseKeyUnits');

const orders = readFileSync(join(root, 'src', 'pages', 'dashboard', 'OrdersPage.tsx'), 'utf8');
assert.ok(orders.includes('parseKeyUnits'), 'OrdersPage must use parseKeyUnits');

const archive = readFileSync(
  join(root, 'supabase', 'functions', '_shared', 'archiveDeletedUser.ts'),
  'utf8',
);
assert.ok(archive.includes('product_keys(content, details, claimed_at)'), 'archive must snapshot key details');
assert.ok(archive.includes('key_units'), 'archive must flatten key_units');

// Behavioral: empty override inherits product content; set override wins.
const DETAILS_MARK = '---PRODUCT_DETAILS---';
function valuesOnly(content) {
  if (!content?.trim()) return '';
  if (!content.includes(DETAILS_MARK)) return content.trim();
  return content.slice(content.indexOf(DETAILS_MARK) + DETAILS_MARK.length).trim();
}
function display(content, keyUnits) {
  return keyUnits
    .map((u) => {
      const raw = u.details?.trim() ? u.details : content;
      const info = valuesOnly(raw);
      const k = u.content.trim();
      if (info && k) return `${info}\n\n${k}`;
      return info || k;
    })
    .filter(Boolean)
    .join('\n\n');
}
assert.equal(
  display(`${DETAILS_MARK}\nDEFAULT`, [{ content: 'KEY-A', details: null }]),
  'DEFAULT\n\nKEY-A',
);
assert.equal(
  display(`${DETAILS_MARK}\nDEFAULT`, [
    { content: 'KEY-B', details: `${DETAILS_MARK}\nOVERRIDE` },
  ]),
  'OVERRIDE\n\nKEY-B',
);

console.log('fulfillment key_units invariants OK');
