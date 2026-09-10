/** Mirrors src/lib/productRequirements.ts — fails if parse/serialize drifts. */
import { strict as assert } from 'node:assert';

function parseRequirements(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const label = typeof item.label === 'string' ? item.label.trim() : '';
    const value = typeof item.value === 'string' ? item.value.trim() : '';
    if (!label && !value) continue;
    out.push({ label, value });
  }
  return out;
}

function serializeRequirements(pairs) {
  return pairs
    .map((p) => ({ label: p.label.trim(), value: p.value.trim() }))
    .filter((p) => p.label || p.value);
}

assert.ok(parseRequirements(null).length === 0, 'null');
assert.ok(parseRequirements([{ label: ' OS ', value: ' Win ' }])[0].label === 'OS', 'trim');
assert.ok(parseRequirements([{ label: '', value: '' }]).length === 0, 'empty drop');
assert.ok(
  JSON.stringify(serializeRequirements([{ label: ' OS ', value: 'Win' }])) ===
    JSON.stringify([{ label: 'OS', value: 'Win' }]),
  'serialize',
);
console.log('productRequirements ok');
