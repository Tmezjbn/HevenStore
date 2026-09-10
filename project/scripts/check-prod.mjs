/**
 * Phase 9 prod invariants — ErrorBoundary, headers, package metadata, npm test wiring.
 * Run: node scripts/check-prod.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

assert.ok(fs.existsSync(path.join(root, 'src/components/ErrorBoundary.tsx')), 'ErrorBoundary missing');
assert.ok(fs.existsSync(path.join(root, 'src/lib/reportError.ts')), 'reportError missing');
assert.match(read('src/lib/reportError.ts'), /client-error/, 'reportError must beacon client-error edge fn');
assert.match(
  read('src/lib/reportError.ts'),
  /beaconStaffError/,
  'staff error beacon must run before analytics consent gate',
);
assert.ok(
  fs.existsSync(path.join(root, 'supabase/functions/client-error/index.ts')),
  'client-error edge function missing',
);
assert.match(
  read('supabase/functions/client-error/index.ts'),
  /CLIENT_ERROR/,
  'client-error must log CLIENT_ERROR for staff logs',
);
assert.doesNotMatch(
  read('supabase/functions/client-error/index.ts'),
  /Access-Control-Allow-Origin': '\*'/,
  'client-error must not use CORS *',
);
assert.match(read('src/App.tsx'), /ErrorBoundary/, 'App must wrap with ErrorBoundary');
assert.match(read('src/main.tsx'), /installGlobalErrorHandlers/, 'main must install global error handlers');

const headers = read('public/_headers');
assert.match(headers, /Content-Security-Policy/, '_headers needs CSP');
assert.match(headers, /X-Frame-Options:\s*DENY/, '_headers needs X-Frame-Options');
assert.match(headers, /X-Content-Type-Options:\s*nosniff/, '_headers needs nosniff');

const vercel = JSON.parse(read('vercel.json'));
assert.ok(Array.isArray(vercel.headers), 'vercel.json needs headers');
const flat = JSON.stringify(vercel);
assert.match(flat, /Content-Security-Policy/, 'vercel.json needs CSP');
assert.match(flat, /X-Frame-Options/, 'vercel.json needs X-Frame-Options');
assert.match(flat, /frame-src/, 'vercel.json CSP needs frame-src');
assert.match(flat, /frame-src 'self' https:/, 'vercel.json frame-src must allow https: embeds');
assert.match(headers, /frame-src/, '_headers CSP needs frame-src');
assert.match(headers, /frame-src 'self' https:/, '_headers frame-src must allow https: embeds');

assert.ok(
  fs.existsSync(path.join(root, 'public/vendor/plyr.svg')),
  'public/vendor/plyr.svg missing (Plyr icons must be same-origin)',
);
assert.match(
  read('src/components/ui/ProductVideoPlayer.tsx'),
  /iconUrl:\s*PLYR_ICON_URL|\/vendor\/plyr\.svg/,
  'ProductVideoPlayer must use same-origin Plyr icons',
);

assert.ok(fs.existsSync(path.join(root, 'README.md')), 'README.md missing');

const pkg = JSON.parse(read('package.json'));
assert.notEqual(pkg.name, 'vite-react-typescript-starter', 'package.json name still scaffold default');
assert.ok(pkg.description?.length > 10, 'package.json needs a description');
assert.match(pkg.scripts?.test ?? '', /run-checks|check-/, 'npm test must run invariant checks');

assert.match(headers, /cdn\.fonts\.coollabs\.io/, '_headers CSP must allow CoolLabs font CDN');
assert.match(flat, /cdn\.fonts\.coollabs\.io/, 'vercel.json CSP must allow CoolLabs font CDN');
assert.match(headers, /Strict-Transport-Security/, '_headers needs HSTS');
assert.match(flat, /Strict-Transport-Security/, 'vercel.json needs HSTS');
assert.match(headers, /Cache-Control:\s*no-cache/, '_headers: index.html no-cache');
assert.match(headers, /max-age=31536000,\s*immutable/, '_headers: hashed assets immutable');
assert.match(flat, /max-age=31536000,\s*immutable/, 'vercel.json: hashed assets immutable');

const html = read('index.html');
assert.ok(!/onload\s*=/.test(html), 'index.html must not use inline onload (CSP script-src-attr)');
assert.match(html, /href="\/favicon\.svg"/, 'index.html must use /favicon.svg (not missing /vite.svg)');
assert.ok(fs.existsSync(path.join(root, 'public/favicon.svg')), 'public/favicon.svg missing');
assert.ok(fs.existsSync(path.join(root, 'public/font-deferred.js')), 'font-deferred.js missing');
assert.match(html, /font-deferred\.js/, 'index.html must load font-deferred.js');

assert.match(read('src/lib/supabase.ts'), /isSupabaseConfigured/, 'supabase must export config flag');
assert.doesNotMatch(
  read('src/lib/supabase.ts'),
  /throw new Error\('Missing VITE_SUPABASE/,
  'supabase must not throw at import (white-screen)',
);
assert.match(read('src/App.tsx'), /MissingEnvScreen|isSupabaseConfigured/, 'App must handle missing env');

const envEx = read('.env.example');
assert.doesNotMatch(envEx, /zeupffmhntpkrmjwjrcp/, '.env.example must not embed live project ref');
assert.doesNotMatch(envEx, /eyJhbGciOiJIUzI1NiIs/, '.env.example must not embed live anon JWT');
assert.match(envEx, /YOUR_PROJECT\.supabase\.co|YOUR_SUPABASE/, '.env.example needs placeholders');

const catalog = read('src/hooks/useCatalog.ts');
assert.match(catalog, /PRODUCT_LIST_COLS/, 'useCatalog must use explicit product column list');
assert.doesNotMatch(
  catalog,
  /\.select\(['"]\*['"]\)/,
  'useCatalog must not select(*)',
);

const coupons = read('src/lib/coupons.ts');
assert.match(coupons, /Math\.round\(raw \* 100\) \/ 100/, 'couponDiscount must round to cents like RPC');

assert.ok(
  fs.existsSync(path.join(root, 'src/components/ui/Hover3dZones.tsx')),
  'Hover3dZones shared component missing',
);
assert.doesNotMatch(
  read('src/pages/dashboard/WebsiteBuilderPage.tsx'),
  /function Hover3dZones/,
  'WebsiteBuilder must not duplicate Hover3dZones',
);

assert.match(
  read('src/layouts/MainLayout.tsx'),
  /ErrorBoundary/,
  'MainLayout must nest ErrorBoundary around Outlet',
);
assert.match(
  read('src/layouts/DashboardLayout.tsx'),
  /ErrorBoundary/,
  'DashboardLayout must nest ErrorBoundary around Outlet',
);
assert.match(
  read('src/hooks/useCatalog.ts'),
  /export const PRODUCT_LIST_COLS/,
  'PRODUCT_LIST_COLS must be exported for SellerPage reuse',
);
assert.match(
  read('src/pages/SellerPage.tsx'),
  /PRODUCT_LIST_COLS/,
  'SellerPage must use PRODUCT_LIST_COLS',
);
assert.doesNotMatch(
  read('src/stores/authStore.ts'),
  /\.select\(['"]\*['"]\)/,
  'authStore must not select(*) profiles',
);
assert.match(read('README.md'), /OPS\.md/, 'README must point at OPS.md runbook');
assert.ok(fs.existsSync(path.join(root, 'OPS.md')), 'OPS.md runbook missing');
assert.match(read('src/lib/dbCols.ts'), /COUPON_COLS/, 'dbCols must define COUPON_COLS');
assert.match(read('src/pages/dashboard/CouponsPage.tsx'), /COUPON_COLS/, 'CouponsPage must use COUPON_COLS');
assert.match(read('src/pages/dashboard/BadgesPage.tsx'), /BADGE_COLS/, 'BadgesPage must use BADGE_COLS');
assert.doesNotMatch(
  read('src/pages/dashboard/CouponsPage.tsx'),
  /\.select\(['"]\*['"]\)/,
  'CouponsPage must not select(*)',
);
assert.doesNotMatch(
  read('src/pages/dashboard/CategoriesPage.tsx'),
  /\.select\(['"]\*['"]\)/,
  'CategoriesPage must not select(*)',
);
assert.match(read('src/hooks/useCatalog.ts'), /PRODUCT_EDITOR_COLS/, 'PRODUCT_EDITOR_COLS export missing');
assert.doesNotMatch(
  read('src/hooks/useCatalog.ts'),
  /PRODUCT_LIST_COLS\},requirements,atmosphere_logo_ids,created_by,rating_seed/,
  'PRODUCT_EDITOR_COLS must not duplicate rating_seed (already in LIST)',
);
assert.match(
  read('src/pages/dashboard/AdminProductsPage.tsx'),
  /PRODUCT_EDITOR_COLS/,
  'AdminProductsPage list must use PRODUCT_EDITOR_COLS',
);
assert.match(
  read('src/pages/dashboard/OwnerProductsPage.tsx'),
  /PRODUCT_EDITOR_COLS/,
  'OwnerProductsPage list must use PRODUCT_EDITOR_COLS',
);
assert.match(
  read('src/pages/dashboard/ProductEditorPage.tsx'),
  /PRODUCT_EDITOR_COLS/,
  'ProductEditor must use PRODUCT_EDITOR_COLS',
);
assert.doesNotMatch(
  read('src/pages/dashboard/ProductEditorPage.tsx'),
  /\.select\(['"]\*['"]\)/,
  'ProductEditor must not select(*)',
);
assert.doesNotMatch(
  read('src/pages/dashboard/AdminProductsPage.tsx'),
  /\.select\(['"]\*['"]/,
  'AdminProductsPage must not select(*)',
);
assert.doesNotMatch(
  read('src/pages/dashboard/OwnerProductsPage.tsx'),
  /\.select\(['"]\*['"]/,
  'OwnerProductsPage must not select(*)',
);

const pkgHooks = JSON.parse(read('package.json')).devDependencies?.['eslint-plugin-react-hooks'] ?? '';
assert.match(pkgHooks, /^\^?5\.[2-9]/, 'eslint-plugin-react-hooks must be stable 5.2+ (not rc)');
assert.ok(
  fs.existsSync(path.join(root, '.github/dependabot.yml')),
  'Dependabot config missing',
);

console.log('check-prod: ok');
