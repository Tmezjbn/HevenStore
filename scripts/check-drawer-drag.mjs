import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// src/index.css + src/css/*.css (split storefront styles)
function readIndexCss() {
  const _fs = globalThis.process.getBuiltinModule('node:fs');
  const _p = globalThis.process.getBuiltinModule('node:path');
  const _r = _p.resolve(_p.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
  const dir = _p.join(_r, 'src/css');
  return [_fs.readFileSync(_p.join(_r, 'src/index.css'), 'utf8'), ..._fs.readdirSync(dir).filter((f) => f.endsWith('.css')).sort().map((f) => _fs.readFileSync(_p.join(dir, f), 'utf8'))].join('\n');
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hook = readFileSync(join(root, 'src/hooks/useDrawerDrag.ts'), 'utf8');
const nav = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');
const css = readIndexCss();

assert.match(hook, /export function useDrawerDrag/);
assert.match(hook, /CLOSE_PX/);
assert.match(hook, /OPEN_PX/);
assert.match(nav, /useDrawerDrag\(MENU_ID/);
assert.match(nav, /drawer-drag-panel/);
assert.match(css, /\.drawer-drag-panel\.is-dragging/);
assert.match(css, /--drawer-drag-x/);

console.log('drawer drag OK');
