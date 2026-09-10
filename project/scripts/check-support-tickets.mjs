/**
 * Support tickets MVP wiring: role, page, nav, standing constants, migration.
 * Also pins SEC-1 (moderator off keys/secrets) + SEC-2/3 (helper REVOKEs).
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migDir = join(root, 'supabase/migrations');

function mustInclude(file, needle) {
  const src = readFileSync(join(root, file), 'utf8');
  assert.ok(src.includes(needle), `${file} missing ${JSON.stringify(needle)}`);
}

/** Newest CREATE POLICY "name" … ; across all migrations (sorted by filename). */
function latestPolicySql(policyName) {
  let latest = null;
  for (const name of readdirSync(migDir).filter((n) => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migDir, name), 'utf8');
    const re = new RegExp(`CREATE POLICY "${policyName}"[\\s\\S]*?;`, 'g');
    let m;
    while ((m = re.exec(sql))) latest = { file: name, body: m[0] };
  }
  return latest;
}

mustInclude('src/types/index.ts', "'support'");
mustInclude('src/lib/roles.ts', "id: 'support'");
mustInclude('src/lib/roleGuides.ts', 'support:');
mustInclude('src/lib/support.ts', 'SUPPORT_STANDING_PENALTY');
mustInclude('src/lib/support.ts', 'SUPPORT_STANDING_RESTRICT_AT');
mustInclude('src/layouts/DashboardLayout.tsx', "/dashboard/support");
mustInclude('src/layouts/DashboardLayout.tsx', "'support'");
mustInclude('src/App.tsx', 'SupportPage');
mustInclude('src/pages/dashboard/SupportPage.tsx', 'claim_support_ticket');
mustInclude('src/pages/dashboard/SupportPage.tsx', 'escalate_support_ticket');
mustInclude('src/pages/dashboard/SupportPage.tsx', 'reject_support_escalation');
mustInclude('src/pages/dashboard/SupportPage.tsx', 'threadSearchBlob');
mustInclude(
  'src/pages/dashboard/SupportPage.tsx',
  "bin === 'sellers' || bin === 'important' || bin === 'all'",
);
mustInclude(
  'src/pages/dashboard/SupportPage.tsx',
  'Search tickets by name or subject',
);

// FUNC-1: selected thread must survive claim/reject via by-id fetch + selectedFallback
// (bin-switch alone misses reject → open and ?ticket= deep links).
{
  const supportPage = readFileSync(join(root, 'src/pages/dashboard/SupportPage.tsx'), 'utf8');
  assert.match(
    supportPage,
    /const loadTicketById\s*=\s*useCallback/,
    'SupportPage must define loadTicketById',
  );
  assert.match(
    supportPage,
    /\.from\('support_tickets'\)\s*\n\s*\.select\(TICKET_COLS\)\s*\n\s*\.eq\('id'/,
    'loadTicketById must select TICKET_COLS by id',
  );
  assert.match(
    supportPage,
    /useState<SupportTicket\s*\|\s*null>\(null\)/,
    'SupportPage must keep selectedFallback state',
  );
  assert.ok(
    supportPage.includes('selectedFallback'),
    'SupportPage missing selectedFallback',
  );
  assert.match(
    supportPage,
    /tickets\.find\(\(x\) => x\.id === selectedId\)\s*\?\?[\s\S]*?selectedFallback/,
    'selected must fall back to selectedFallback when missing from bin list',
  );
  assert.match(
    supportPage,
    /setSelectedFallback/,
    'SupportPage must update selectedFallback when selection leaves the list',
  );
}

// FUNC-2: bin clicks / setBin must write ?bin= so refresh + moderator shortcuts restore it.
{
  const supportPage = readFileSync(join(root, 'src/pages/dashboard/SupportPage.tsx'), 'utf8');
  assert.match(
    supportPage,
    /params\.get\('bin'\)/,
    'SupportPage must read ?bin= on mount / from search params',
  );
  assert.match(
    supportPage,
    /next\.set\('bin',\s*bin\)/,
    'SupportPage must sync bin state into ?bin= search param',
  );
  assert.match(
    supportPage,
    /\['queue',\s*'important',\s*'sellers',\s*'mine',\s*'all'\]/,
    'SupportPage must allow queue|important|sellers|mine|all as ?bin= values',
  );
}

// FUNC-3: ticket list must poll on SUPPORT_POLL_MS and pause while the tab is hidden.
{
  const supportPage = readFileSync(join(root, 'src/pages/dashboard/SupportPage.tsx'), 'utf8');
  const supportLib = readFileSync(join(root, 'src/lib/support.ts'), 'utf8');
  assert.match(
    supportLib,
    /export const SUPPORT_POLL_MS\s*=\s*4000/,
    'support.ts must export SUPPORT_POLL_MS = 4000',
  );
  assert.match(
    supportPage,
    /loadTickets\(\{\s*quiet:\s*true\s*\}\)/,
    'SupportPage list poll must call loadTickets({ quiet: true })',
  );
  assert.match(
    supportPage,
    /setInterval\(\(\)\s*=>\s*\{[\s\S]*?document\.hidden[\s\S]*?loadTickets\(\{\s*quiet:\s*true\s*\}\)/,
    'SupportPage list poll must skip ticks while document.hidden',
  );
  assert.match(
    supportPage,
    /SUPPORT_POLL_MS/,
    'SupportPage must use SUPPORT_POLL_MS for polling',
  );
  assert.ok(
    supportLib.includes('realtime') || supportLib.includes('postgres_changes'),
    'support.ts ponytail note must keep Realtime as the upgrade path',
  );
}
mustInclude('src/pages/dashboard/DashboardHomePage.tsx', 'SupportDashboardHome');
mustInclude(
  'supabase/migrations/20260723230000_support_tickets.sql',
  "'support'",
);
mustInclude(
  'supabase/migrations/20260723230000_support_tickets.sql',
  'support_tickets',
);
mustInclude(
  'supabase/migrations/20260723230000_support_tickets.sql',
  'reject_support_escalation',
);
mustInclude(
  'supabase/migrations/20260723230000_support_tickets.sql',
  'Live support tickets in the dashboard',
);
mustInclude('src/lib/changelogs.ts', 'Live support tickets in the dashboard');

// Moderator no longer gets Products nav
const layout = readFileSync(join(root, 'src/layouts/DashboardLayout.tsx'), 'utf8');
assert.match(
  layout,
  /labelEn: 'Products', href: '\/dashboard\/products', roles: \['owner', 'admin'\]/,
);
assert.doesNotMatch(
  layout,
  /labelEn: 'Products', href: '\/dashboard\/products', roles: \[[^\]]*moderator/,
);

// SEC-1: newest staff policies on keys/secrets exclude moderator; keep seller branch.
for (const policyName of ['product_keys_staff_all', 'product_secrets_staff_all']) {
  const hit = latestPolicySql(policyName);
  assert.ok(hit, `missing CREATE POLICY "${policyName}"`);
  assert.match(
    hit.file,
    /moderator_strip_fulfillment_secrets\.sql$/,
    `${policyName} newest definition must be moderator_strip migration (got ${hit.file})`,
  );
  assert.doesNotMatch(
    hit.body,
    /moderator/,
    `${policyName} in ${hit.file} must not mention moderator`,
  );
  assert.match(
    hit.body,
    /role IN \('owner',\s*'admin'\)/,
    `${policyName} must allow owner/admin`,
  );
  assert.match(
    hit.body,
    /seller_id = auth\.uid\(\)/,
    `${policyName} must keep seller-owns-product branch`,
  );
  assert.doesNotMatch(
    hit.body,
    /'\s*support\s*'/,
    `${policyName} must not grant support`,
  );
}

// SEC-2 / SEC-3: internal helpers must REVOKE client EXECUTE; never GRANT authenticated.
const supportMig = readFileSync(
  join(root, 'supabase/migrations/20260723230000_support_tickets.sql'),
  'utf8',
);
for (const revoke of [
  'REVOKE ALL ON FUNCTION public.notify_users(uuid[], text, text, text, text, text, jsonb)',
  'REVOKE ALL ON FUNCTION public.support_role_ids(text[])',
]) {
  assert.ok(
    supportMig.includes(revoke) &&
      /FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated/i.test(
        supportMig.slice(supportMig.indexOf(revoke), supportMig.indexOf(revoke) + 200),
      ),
    `support migration must ${revoke} FROM PUBLIC, anon, authenticated`,
  );
}
assert.doesNotMatch(
  supportMig,
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.notify_users/i,
  'notify_users must never be GRANT EXECUTE to clients',
);
assert.doesNotMatch(
  supportMig,
  /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.support_role_ids/i,
  'support_role_ids must never be GRANT EXECUTE to clients',
);

/** Newest CREATE OR REPLACE FUNCTION public.name(...); across migrations. */
function latestFunctionSql(fnName) {
  let latest = null;
  const re = new RegExp(
    `CREATE OR REPLACE FUNCTION public\\.${fnName}\\([\\s\\S]*?AS\\s*\\$\\$[\\s\\S]*?\\$\\$;`,
    'g',
  );
  for (const name of readdirSync(migDir).filter((n) => n.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migDir, name), 'utf8');
    let m;
    while ((m = re.exec(sql))) latest = { file: name, body: m[0] };
  }
  return latest;
}

// SEC-4: open/post must call check_rpc_rate (newest body wins).
for (const [fn, limit] of [
  ['open_support_ticket', 5],
  ['post_support_message', 20],
]) {
  const hit = latestFunctionSql(fn);
  assert.ok(hit, `missing CREATE OR REPLACE FUNCTION public.${fn}`);
  assert.match(
    hit.file,
    /support_ticket_rate_limits\.sql$/,
    `${fn} newest body must be rate-limits migration (got ${hit.file})`,
  );
  assert.match(
    hit.body,
    new RegExp(
      `check_rpc_rate\\(\\s*'${fn}'\\s*,\\s*${limit}\\s*,\\s*60\\s*\\)`,
    ),
    `${fn} in ${hit.file} must call check_rpc_rate('${fn}', ${limit}, 60)`,
  );
}

// UX-5: Cart / Checkout Success Help → ticket desk, not bare /about
{
  const cart = readFileSync(join(root, 'src/pages/CartPage.tsx'), 'utf8');
  const success = readFileSync(join(root, 'src/pages/CheckoutSuccessPage.tsx'), 'utf8');
  assert.match(
    cart,
    /to=\{user \? '\/dashboard\/support' : '\/auth\/login\?next=\/dashboard\/support'\}/,
    'Cart Help must target /dashboard/support (login?next= for guests)',
  );
  assert.ok(cart.includes('Help & support'), 'Cart must keep Help & support label');
  assert.doesNotMatch(
    cart,
    /to="\/about"[\s\S]{0,160}Help & support/,
    'Cart Help must not point at bare /about',
  );
  assert.match(
    success,
    /to="\/dashboard\/support"[\s\S]{0,120}Help & support/,
    'CheckoutSuccess Help must target /dashboard/support',
  );
  assert.doesNotMatch(
    success,
    /to="\/about"[\s\S]{0,160}Help & support/,
    'CheckoutSuccess Help must not point at bare /about',
  );
}

console.log('check-support-tickets: ok');
