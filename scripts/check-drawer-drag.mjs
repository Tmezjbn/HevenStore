import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hook = readFileSync(join(root, 'src/hooks/useDrawerDrag.ts'), 'utf8');
const nav = readFileSync(join(root, 'src/components/layout/Navbar.tsx'), 'utf8');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');

assert.match(hook, /export function useDrawerDrag/);
assert.match(hook, /CLOSE_PX/);
assert.match(hook, /OPEN_PX/);
assert.match(nav, /useDrawerDrag\(MENU_ID/);
assert.match(nav, /drawer-drag-panel/);
assert.match(css, /\.drawer-drag-panel\.is-dragging/);
assert.match(css, /--drawer-drag-x/);

console.log('drawer drag OK');
