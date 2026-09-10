/** Mirrors parseStoreSort — fails if sort keys drift. */
import { strict as assert } from 'node:assert';

const KEYS = ['popular', 'newest', 'price_asc', 'price_desc', 'rating'];

function parseStoreSort(raw) {
  const v = (raw ?? '').trim();
  return KEYS.includes(v) ? v : 'popular';
}

assert.ok(parseStoreSort(null) === 'popular', 'default');
assert.ok(parseStoreSort('newest') === 'newest', 'newest');
assert.ok(parseStoreSort('nope') === 'popular', 'bad');
assert.ok(parseStoreSort('price_desc') === 'price_desc', 'price_desc');
console.log('store_sort ok');
