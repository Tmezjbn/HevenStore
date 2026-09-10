/**
 * safeHref allowlist + ConfirmDialog replaces native confirm.
 * Run: node scripts/check-safe-href.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const safe = read('src/lib/safeHref.ts');
assert.match(safe, /export function safeHref/, 'safeHref export');
assert.match(safe, /https:/, 'https allowlist');
assert.match(safe, /mailto:/, 'mailto allowlist');
assert.doesNotMatch(safe, /javascript:/i, 'must not allow javascript:');

const footer = read('src/components/layout/Footer.tsx');
assert.match(footer, /safeHref/, 'Footer must filter owner URLs');

const confirm = read('src/components/dashboard/ConfirmDialog.tsx');
assert.match(confirm, /from ['"].*Modal['"]/, 'ConfirmDialog wraps Modal');

for (const file of [
  'src/pages/dashboard/AdminProductsPage.tsx',
  'src/pages/dashboard/OwnerProductsPage.tsx',
  'src/pages/dashboard/CouponsPage.tsx',
  'src/pages/dashboard/BadgesPage.tsx',
  'src/pages/dashboard/CategoriesPage.tsx',
  'src/pages/dashboard/OwnerChangelogsPage.tsx',
  'src/pages/dashboard/ProductEditorPage.tsx',
]) {
  const src = read(file);
  assert.match(src, /ConfirmDialog/, `${file} must use ConfirmDialog`);
  assert.doesNotMatch(src, /\bconfirm\s*\(/, `${file} must not use window.confirm`);
}

// Storefront prose contrast (not decorative icons)
for (const [file, needle] of [
  ['src/pages/HomePage.tsx', 'text-base-content/70'],
  ['src/pages/GamesPage.tsx', 'text-base-content/70'],
  ['src/pages/AboutPage.tsx', 'text-base-content/70'],
  ['src/pages/ProductDetailPage.tsx', 'text-base-content/70'],
  ['src/components/layout/Footer.tsx', 'text-base-content/70'],
]) {
  assert.ok(read(file).includes(needle), `${file} missing readable muted prose class`);
}

console.log('check-safe-href: ok');
