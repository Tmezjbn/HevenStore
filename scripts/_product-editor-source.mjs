/**
 * Source text of the product editor: the route entry plus every file in
 * src/pages/dashboard/productEditor/ (the page was split into modules).
 * Check scripts regex-assert on this concatenation instead of the entry alone.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function readProductEditorSource() {
  const dir = join(root, 'src', 'pages', 'dashboard', 'productEditor');
  const parts = [readFileSync(join(root, 'src', 'pages', 'dashboard', 'ProductEditorPage.tsx'), 'utf8')];
  for (const f of readdirSync(dir).sort()) {
    if (/\.(ts|tsx)$/.test(f)) parts.push(readFileSync(join(dir, f), 'utf8'));
  }
  return parts.join('\n');
}
