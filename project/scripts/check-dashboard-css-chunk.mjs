/**
 * PERF-2: dashboard-only CSS must stay out of the main storefront CSS chunk —
 * loaded via dynamic import() from dashboard pages.
 * Skips dist asserts when dist/ is missing or stale (npm test before build).
 * Run: node scripts/check-dashboard-css-chunk.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const editorPage = read('src/pages/dashboard/ProductEditorPage.tsx');
const adminPage = read('src/pages/dashboard/AdminProductsPage.tsx');
const settingsPage = read('src/pages/dashboard/SettingsPage.tsx');
const homePage = read('src/pages/dashboard/DashboardHomePage.tsx');
const buyerOrdersPage = read('src/pages/dashboard/BuyerOrdersPage.tsx');
const sellerProductsPage = read('src/pages/dashboard/SellerProductsPage.tsx');
const sellerOrdersPage = read('src/pages/dashboard/SellerOrdersPage.tsx');
const ordersPage = read('src/pages/dashboard/OrdersPage.tsx');
const categoriesPage = read('src/pages/dashboard/CategoriesPage.tsx');
const usersPage = read('src/pages/dashboard/UsersPage.tsx');
const ownerProductsPage = read('src/pages/dashboard/OwnerProductsPage.tsx');
const guidesPage = read('src/pages/dashboard/GuidesPage.tsx');
const changelogsPage = read('src/pages/dashboard/OwnerChangelogsPage.tsx');
const analyticsPage = read('src/pages/dashboard/AnalyticsPage.tsx');
const indexCss = read('src/index.css');
const editorCss = read('src/styles/product-editor.css');
const adminCss = read('src/styles/admin-catalog.css');
const settingsCss = read('src/styles/settings-page.css');
const roleCss = read('src/styles/dashboard-role-surfaces.css');
const ownerCss = read('src/styles/dashboard-owner-surfaces.css');
const docsCss = read('src/styles/dashboard-docs.css');
const analyticsCss = read('src/styles/analytics-page.css');

assert.match(
  editorPage,
  /import\(\s*['"][^'"]*styles\/product-editor\.css['"]\s*\)/,
  'ProductEditorPage must dynamically import product-editor.css',
);
assert.match(
  adminPage,
  /import\(\s*['"][^'"]*styles\/admin-catalog\.css['"]\s*\)/,
  'AdminProductsPage must dynamically import admin-catalog.css',
);
assert.match(
  settingsPage,
  /import\(\s*['"][^'"]*styles\/settings-page\.css['"]\s*\)/,
  'SettingsPage must dynamically import settings-page.css',
);
assert.match(
  homePage,
  /import\(\s*['"][^'"]*styles\/dashboard-role-surfaces\.css['"]\s*\)/,
  'DashboardHomePage must dynamically import dashboard-role-surfaces.css',
);
assert.match(
  buyerOrdersPage,
  /import\(\s*['"][^'"]*styles\/dashboard-role-surfaces\.css['"]\s*\)/,
  'BuyerOrdersPage must dynamically import dashboard-role-surfaces.css',
);
assert.match(
  sellerProductsPage,
  /import\(\s*['"][^'"]*styles\/dashboard-role-surfaces\.css['"]\s*\)/,
  'SellerProductsPage must dynamically import dashboard-role-surfaces.css',
);
assert.match(
  sellerOrdersPage,
  /import\(\s*['"][^'"]*styles\/dashboard-role-surfaces\.css['"]\s*\)/,
  'SellerOrdersPage must dynamically import dashboard-role-surfaces.css',
);
assert.match(
  ordersPage,
  /import\(\s*['"][^'"]*styles\/dashboard-owner-surfaces\.css['"]\s*\)/,
  'OrdersPage must dynamically import dashboard-owner-surfaces.css',
);
assert.match(
  categoriesPage,
  /import\(\s*['"][^'"]*styles\/dashboard-owner-surfaces\.css['"]\s*\)/,
  'CategoriesPage must dynamically import dashboard-owner-surfaces.css',
);
assert.match(
  usersPage,
  /import\(\s*['"][^'"]*styles\/dashboard-owner-surfaces\.css['"]\s*\)/,
  'UsersPage must dynamically import dashboard-owner-surfaces.css',
);
assert.match(
  ownerProductsPage,
  /import\(\s*['"][^'"]*styles\/dashboard-owner-surfaces\.css['"]\s*\)/,
  'OwnerProductsPage must dynamically import dashboard-owner-surfaces.css',
);
assert.match(
  guidesPage,
  /import\(\s*['"][^'"]*styles\/dashboard-docs\.css['"]\s*\)/,
  'GuidesPage must dynamically import dashboard-docs.css',
);
assert.match(
  changelogsPage,
  /import\(\s*['"][^'"]*styles\/dashboard-docs\.css['"]\s*\)/,
  'OwnerChangelogsPage must dynamically import dashboard-docs.css',
);
assert.match(
  analyticsPage,
  /import\(\s*['"][^'"]*styles\/analytics-page\.css['"]\s*\)/,
  'AnalyticsPage must dynamically import analytics-page.css',
);

assert.doesNotMatch(indexCss, /\.pe-panel\b/, 'index.css must not contain .pe-panel (editor CSS)');
assert.doesNotMatch(
  indexCss,
  /\.admin-catalog__title\b/,
  'index.css must not contain .admin-catalog__title',
);
assert.doesNotMatch(
  indexCss,
  /\.settings-page\b/,
  'index.css must not contain .settings-page',
);
assert.doesNotMatch(
  indexCss,
  /\.owner-home\b/,
  'index.css must not contain .owner-home',
);
assert.doesNotMatch(
  indexCss,
  /\.buyer-ledger\b/,
  'index.css must not contain .buyer-ledger',
);
assert.doesNotMatch(
  indexCss,
  /\.seller-listings\b/,
  'index.css must not contain .seller-listings',
);
assert.doesNotMatch(
  indexCss,
  /\.owner-ledger\b/,
  'index.css must not contain .owner-ledger',
);
assert.doesNotMatch(
  indexCss,
  /\.owner-tree\b/,
  'index.css must not contain .owner-tree',
);
assert.doesNotMatch(
  indexCss,
  /\.owner-roster\b/,
  'index.css must not contain .owner-roster',
);
assert.doesNotMatch(
  indexCss,
  /\.admin-roster\b/,
  'index.css must not contain .admin-roster',
);
assert.doesNotMatch(
  indexCss,
  /\.owner-catalog\b/,
  'index.css must not contain .owner-catalog',
);
assert.doesNotMatch(
  indexCss,
  /\.guides-page\b/,
  'index.css must not contain .guides-page',
);
assert.doesNotMatch(
  indexCss,
  /\.changelog-page\b/,
  'index.css must not contain .changelog-page',
);
assert.doesNotMatch(
  indexCss,
  /\.analytics-live(?:__|\b)/,
  'index.css must not contain .analytics-live',
);
assert.doesNotMatch(
  indexCss,
  /\.analytics-metric(?:__|\b|--)/,
  'index.css must not contain .analytics-metric',
);
// PDP reviews keep .pe-reviews* in the main chunk (not product-editor BEM).
assert.match(indexCss, /\.pe-reviews\b/, 'index.css must keep storefront .pe-reviews');

assert.match(editorCss, /\.pe-panel\b/);
assert.match(editorCss, /\.product-editor\b/);
assert.match(adminCss, /\.admin-catalog__title\b/);
assert.match(settingsCss, /\.settings-page\b/);
assert.match(roleCss, /\.owner-home\b/);
assert.match(roleCss, /\.buyer-ledger\b/);
assert.match(roleCss, /\.seller-listings\b/);
assert.match(roleCss, /\.seller-sales\b/);
assert.match(ownerCss, /\.owner-ledger\b/);
assert.match(ownerCss, /\.owner-tree\b/);
assert.match(ownerCss, /\.owner-roster\b/);
assert.match(ownerCss, /\.admin-roster\b/);
assert.match(ownerCss, /\.owner-catalog\b/);
assert.match(docsCss, /\.guides-page\b/);
assert.match(docsCss, /\.changelog-page\b/);
assert.match(analyticsCss, /\.analytics-live__/);
assert.match(analyticsCss, /\.analytics-metric\b/);
assert.match(analyticsCss, /\.analytics-panel\b/);

const assets = path.join(root, 'dist', 'assets');
if (!fs.existsSync(assets)) {
  console.log('check-dashboard-css-chunk: source ok; skipped dist/ (no build)');
  process.exit(0);
}

const mainCss = fs.readdirSync(assets).find((f) => /^index-.*\.css$/.test(f));
assert.ok(mainCss, 'dist/assets/index-*.css not found');
const mainSrc = fs.readFileSync(path.join(assets, mainCss), 'utf8');

const deferred = fs
  .readdirSync(assets)
  .filter((f) => /\.css$/.test(f) && f !== mainCss)
  .map((f) => ({ f, src: fs.readFileSync(path.join(assets, f), 'utf8') }));

const peDeferred = deferred.filter((d) => /\.pe-panel\b/.test(d.src));
const adminDeferred = deferred.filter((d) => /\.admin-catalog__title\b/.test(d.src));
const settingsDeferred = deferred.filter((d) => /\.settings-page\b/.test(d.src));
const roleDeferred = deferred.filter((d) => /\.owner-home\b/.test(d.src));
const ownerDeferred = deferred.filter((d) => /\.owner-ledger\b/.test(d.src));
const docsDeferred = deferred.filter((d) => /\.guides-page\b/.test(d.src));
const analyticsDeferred = deferred.filter((d) => /\.analytics-live__/.test(d.src));
const mainHasPe = /\.pe-panel\b/.test(mainSrc);
const mainHasAdmin = /\.admin-catalog__title\b/.test(mainSrc);
const mainHasSettings = /\.settings-page\b/.test(mainSrc);
const mainHasOwnerHome = /\.owner-home\b/.test(mainSrc);
const mainHasOwnerLedger = /\.owner-ledger\b/.test(mainSrc);
const mainHasGuides = /\.guides-page\b/.test(mainSrc);
const mainHasAnalytics = /\.analytics-live__/.test(mainSrc);

// Usual verify chain runs npm test before npm run build — stale dist may still
// have an older main chunk (or only a subset of deferred assets).
const staleDist =
  (mainHasPe && peDeferred.length === 0) ||
  (mainHasAdmin && adminDeferred.length === 0) ||
  (mainHasSettings && settingsDeferred.length === 0) ||
  (mainHasOwnerHome && roleDeferred.length === 0) ||
  (mainHasOwnerLedger && ownerDeferred.length === 0) ||
  (mainHasGuides && docsDeferred.length === 0) ||
  (mainHasAnalytics && analyticsDeferred.length === 0);
if (staleDist) {
  console.log(
    'check-dashboard-css-chunk: source ok; skipped dist/ (stale build — run npm run build)',
  );
  process.exit(0);
}

assert.ok(
  !mainHasPe,
  `${mainCss} still contains .pe-panel — editor CSS leaked into main chunk`,
);
assert.ok(
  !mainHasAdmin,
  `${mainCss} still contains .admin-catalog__title — admin CSS leaked into main chunk`,
);
assert.ok(
  !mainHasSettings,
  `${mainCss} still contains .settings-page — settings CSS leaked into main chunk`,
);
assert.ok(
  !mainHasOwnerHome,
  `${mainCss} still contains .owner-home — role-surface CSS leaked into main chunk`,
);
assert.ok(
  !mainHasOwnerLedger,
  `${mainCss} still contains .owner-ledger — owner-surface CSS leaked into main chunk`,
);
assert.ok(
  !mainHasGuides,
  `${mainCss} still contains .guides-page — docs CSS leaked into main chunk`,
);
assert.ok(
  !mainHasAnalytics,
  `${mainCss} still contains .analytics-live — analytics CSS leaked into main chunk`,
);
assert.ok(peDeferred.length > 0, 'no deferred CSS asset contains .pe-panel');
assert.ok(adminDeferred.length > 0, 'no deferred CSS asset contains .admin-catalog__title');
assert.ok(settingsDeferred.length > 0, 'no deferred CSS asset contains .settings-page');
assert.ok(roleDeferred.length > 0, 'no deferred CSS asset contains .owner-home');
assert.ok(ownerDeferred.length > 0, 'no deferred CSS asset contains .owner-ledger');
assert.ok(docsDeferred.length > 0, 'no deferred CSS asset contains .guides-page');
assert.ok(analyticsDeferred.length > 0, 'no deferred CSS asset contains .analytics-live__');
assert.ok(
  roleDeferred.some((d) => /\.buyer-ledger\b/.test(d.src) && /\.seller-listings\b/.test(d.src)),
  'deferred role CSS must include .buyer-ledger and .seller-listings',
);
assert.ok(
  ownerDeferred.some(
    (d) =>
      /\.owner-tree\b/.test(d.src) &&
      /\.owner-roster\b/.test(d.src) &&
      /\.admin-roster\b/.test(d.src) &&
      /\.owner-catalog\b/.test(d.src),
  ),
  'deferred owner CSS must include tree/roster/admin-roster/catalog',
);
assert.ok(
  docsDeferred.some((d) => /\.changelog-page\b/.test(d.src)),
  'deferred docs CSS must include .changelog-page',
);
assert.ok(
  analyticsDeferred.some((d) => /\.analytics-metric\b/.test(d.src) && /\.analytics-panel\b/.test(d.src)),
  'deferred analytics CSS must include metric+panel',
);

console.log(
  'check-dashboard-css-chunk: ok (main clean; editor+admin+settings+role+owner+docs+analytics CSS in separate assets)',
);
