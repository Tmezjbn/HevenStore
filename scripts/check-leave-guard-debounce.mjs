/** PERF-5 search debounce + builder leave-guard wiring. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = readFileSync(join(root, 'src/pages/GamesPage.tsx'), 'utf8');
assert.match(store, /searchDraft/);
assert.match(store, /setTimeout/);
assert.match(store, /200/);
assert.match(store, /onChange=\{\(e\) => setSearchDraft/);

const builder = readFileSync(join(root, 'src/pages/dashboard/WebsiteBuilderPage.tsx'), 'utf8');
assert.match(builder, /useBlocker/);
assert.match(builder, /builderDirty/);
assert.match(builder, /beforeunload/);
assert.match(builder, /Applying this preset replaces unsaved changes/);
assert.match(builder, /You have unsaved changes\. Leave this page\?/);

const editor = readFileSync(join(root, 'src/pages/dashboard/ProductEditorPage.tsx'), 'utf8');
assert.match(editor, /useBlocker/);
assert.match(editor, /beforeunload/);
assert.match(editor, /dirty && !saving/);
assert.match(editor, /You have unsaved changes\. Leave this page\?/);
assert.match(editor, /setBaseline\(editorSnapshot/);
// ProductEditor is on the ConfirmDialog allowlist — leave guard must not use window.confirm.
assert.match(editor, /leaveBlocker\.proceed/);
assert.match(editor, /leaveBlocker\.reset/);
assert.doesNotMatch(editor, /\bconfirm\s*\(/);

// useBlocker requires a data router (BrowserRouter throws → ErrorBoundary on /builder).
const app = readFileSync(join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /createBrowserRouter/, 'App must use createBrowserRouter for useBlocker');
assert.match(app, /RouterProvider/, 'App must render RouterProvider');
assert.doesNotMatch(
  app,
  /(?:import\s*\{[^}]*\bBrowserRouter\b|<BrowserRouter\b)/,
  'App must not use BrowserRouter component (breaks useBlocker)',
);

console.log('leave-guard + search debounce OK');
