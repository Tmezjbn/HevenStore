/** Boot splash + AppBootGate keep first paint from flashing live content. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const html = readFileSync(join(root, 'index.html'), 'utf8');
assert.match(html, /id="boot-splash"/);
assert.match(html, /HEVEN\.FUN/);

const gate = readFileSync(join(root, 'src/components/ui/AppBootGate.tsx'), 'utf8');
assert.match(gate, /BOOT_MAX_MS\s*=\s*1800/);
assert.match(gate, /isPlaceholderData/);
assert.match(gate, /authLoading/);

const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /AppBootGate/);

const fx = readFileSync(join(root, 'src/components/ui/ProductCardBodyFx.tsx'), 'utf8');
assert.match(fx, /product-card__fx-matrix-head/);
assert.match(fx, /MATRIX_GLYPHS/);

console.log('check-boot-splash: ok');
