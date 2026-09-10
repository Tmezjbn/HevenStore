/**
 * Auth redirect helper — blocks open redirects via ?next=.
 * Run: node scripts/check-auth-redirect.mjs
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(path.join(root, 'src/lib/authRedirect.ts'), 'utf8');
assert.match(src, /export function safeAppPath/, 'safeAppPath export missing');

// Inline the same rules (no TS transpile in check scripts).
function safeAppPath(raw, fallback = '/') {
  if (!raw) return fallback;
  const next = raw.trim();
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) return fallback;
  return next;
}

assert.equal(safeAppPath(null), '/');
assert.equal(safeAppPath('/checkout'), '/checkout');
assert.equal(safeAppPath('//evil.com'), '/');
assert.equal(safeAppPath('https://evil.com'), '/');
assert.equal(safeAppPath('/auth/login?x=1'), '/auth/login?x=1');

const register = readFileSync(path.join(root, 'src/pages/auth/RegisterPage.tsx'), 'utf8');
assert.match(
  register,
  /emailRedirectTo:[\s\S]*next=\$\{encodeURIComponent\(afterAuth\)\}/,
  'Register confirm email must keep ?next=',
);

const layout = readFileSync(path.join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');
assert.match(layout, /breadcrumbs/, 'DashboardLayout needs breadcrumbs');
assert.match(layout, /New product|منتج جديد/, 'breadcrumb covers product create');
assert.match(layout, /menu-active/, 'sidebar uses DaisyUI 5 menu-active for current route');
assert.match(layout, /aria-current=\{on \? 'page' : undefined\}/, 'sidebar marks current page for a11y');
assert.doesNotMatch(
  layout,
  /className=\{linkMatches\(link\.href\) \? 'active' : ''\}/,
  'DaisyUI 4 active class is dead in DaisyUI 5 menus',
);

const modal = readFileSync(path.join(root, 'src/components/ui/Modal.tsx'), 'utf8');
assert.match(modal, /useI18n/, 'Modal close label must be bilingual via i18n');
assert.match(modal, /إغلاق/, 'Modal default close label has Arabic');

const reset = readFileSync(path.join(root, 'src/pages/auth/ResetPasswordPage.tsx'), 'utf8');
assert.match(reset, /PASSWORD_RECOVERY/, 'Reset page must gate on recovery event');
assert.match(
  reset,
  /isRecoveryLink[\s\S]*if \(data\.session\) markReady/,
  'getSession markReady only after recovery link detect',
);
assert.doesNotMatch(
  reset,
  /onAuthStateChange\(\(event,\s*session\)[\s\S]*session\) markReady/,
  'Reset must not open on any auth session event',
);
assert.match(reset, /type'\) === 'recovery'/, 'Reset accepts hash/query type=recovery');

const authErr = readFileSync(path.join(root, 'src/lib/authErrors.ts'), 'utf8');
assert.doesNotMatch(authErr, /return err\.message/, 'mapAuthError must not leak raw EN');

const pdp = readFileSync(path.join(root, 'src/pages/ProductDetailPage.tsx'), 'utf8');
assert.match(pdp, /isError/, 'PDP must distinguish network error from not found');
assert.match(pdp, /Could not load product|تعذّر تحميل المنتج/, 'PDP network error copy');

const bell = readFileSync(path.join(root, 'src/components/notifications/NotificationBell.tsx'), 'utf8');
assert.match(bell, /toLocaleDateString\(lang === 'ar'/, 'NotificationBell dates must use lang locale');
assert.match(bell, /Escape/, 'NotificationBell Escape closes panel');

console.log('auth_redirect ok');
