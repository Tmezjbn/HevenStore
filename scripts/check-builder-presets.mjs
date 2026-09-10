/** Mirrors parseBuilderPresets — fails if logic drifts. */
import { strict as assert } from 'node:assert';

const KEYS = ['home_sections', 'hero_media', 'plyr_json'];
const MAX = 5;

function parseBuilderPresets(raw) {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out = [];
    for (const item of parsed.slice(0, MAX)) {
      if (!item || typeof item !== 'object') continue;
      const snapRaw = item.snapshot && typeof item.snapshot === 'object' ? item.snapshot : {};
      const snapshot = {};
      for (const key of KEYS) {
        if (typeof snapRaw[key] === 'string') snapshot[key] = snapRaw[key];
      }
      out.push({
        id: typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `preset-${out.length + 1}`,
        name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : `Preset ${out.length + 1}`,
        locked: item.locked === true,
        snapshot,
      });
    }
    return out;
  } catch {
    return [];
  }
}

assert.ok(parseBuilderPresets('').length === 0, 'empty');
assert.ok(parseBuilderPresets('nope').length === 0, 'garbage');
const one = parseBuilderPresets(
  JSON.stringify([{ id: 'a', name: 'A', locked: true, snapshot: { hero_media: '[]', junk: 1 } }])
);
assert.ok(one.length === 1 && one[0].locked === true && one[0].snapshot.hero_media === '[]', 'one');
assert.ok(one[0].snapshot.junk === undefined, 'strip unknown');
const many = parseBuilderPresets(JSON.stringify(Array.from({ length: 8 }, (_, i) => ({ id: String(i), name: String(i), snapshot: {} }))));
assert.ok(many.length === MAX, 'cap');
console.log('builder_presets ok');
