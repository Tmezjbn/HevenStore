/**
 * Store wallet invariants (HANDOFF #15). Run: node scripts/check-wallet.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sql = read('supabase/migrations/20261012160000_store_wallet.sql');
const TABLES = ['wallets', 'wallet_ledger', 'wallet_topups'];

for (const t of TABLES) {
  assert.ok(sql.includes(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`), `RLS not enabled on ${t}`);
}
// No INSERT/UPDATE/DELETE/ALL policies at all (only SELECT).
const policies = [...sql.matchAll(/CREATE POLICY\s+\S+\s+ON\s+public\.(\w+)\s+FOR\s+(\w+)/gi)];
assert.equal(policies.length, 3, 'expected exactly 3 wallet policies');
for (const [, table, cmd] of policies) {
  assert.ok(TABLES.includes(table), `unexpected policy table ${table}`);
  assert.equal(cmd.toUpperCase(), 'SELECT', `${table} must only have a SELECT policy, got ${cmd}`);
}
assert.match(sql, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON[^;]*FROM authenticated/, 'table writes must be revoked');

assert.match(
  sql,
  /REVOKE ALL ON FUNCTION public\.credit_wallet_topup\(uuid, text, text, numeric\) FROM PUBLIC, anon, authenticated/,
  'credit_wallet_topup must be revoked from authenticated',
);
assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.credit_wallet_topup\([^)]*\) TO service_role/);
assert.ok(!/GRANT EXECUTE ON FUNCTION public\.credit_wallet_topup[^;]*authenticated/.test(sql));
assert.ok(sql.includes('WALLET_LEDGER_APPEND_ONLY'), 'ledger append-only trigger missing');
assert.ok(sql.includes('wallet_topup_max_usd') && sql.includes('guard_wallet_settings'), 'settings guard missing');

// pay_order_with_wallet: locks wallet, finalizes through the shared path, one transaction.
const pay = sql.slice(sql.indexOf('FUNCTION public.pay_order_with_wallet'));
const payBody = pay.slice(0, pay.indexOf('REVOKE ALL ON FUNCTION public.pay_order_with_wallet'));
assert.match(payBody, /FROM public\.wallets WHERE user_id = v_user FOR UPDATE/, 'wallet must be locked FOR UPDATE');
assert.ok(payBody.includes('public.finalize_paid_order('), 'must finalize via finalize_paid_order');
assert.ok(payBody.includes("'INSUFFICIENT_FUNDS'") && payBody.includes("'ORDER_NOT_PAYABLE'"));
assert.ok(payBody.includes('auth.uid()'), 'must authenticate caller');
assert.ok(!/UPDATE public\.products|UPDATE public\.orders SET status/.test(payBody), 'stock/status only via finalize_paid_order');

// Webhook: HMAC-SHA512 over key-sorted JSON, constant-time, 401 on failure.
const hook = read('supabase/functions/nowpayments-webhook/index.ts');
for (const s of ['x-nowpayments-sig', 'SHA-512', 'sortKeys', 'timingSafeEqual', 'NOWPAYMENTS_IPN_SECRET', 'status: 401', 'credit_wallet_topup']) {
  assert.ok(hook.includes(s), `nowpayments-webhook missing: ${s}`);
}
assert.ok(read('supabase/config.toml').includes('[functions.nowpayments-webhook]'), 'config.toml must pin webhook verify_jwt');

const topup = read('supabase/functions/wallet-topup/index.ts');
assert.ok(topup.includes('provider_not_configured') && topup.includes('create_wallet_topup'));

// Client code never writes wallet tables.
const forbidden = /\.from\(\s*['"`](wallets|wallet_ledger|wallet_topups)['"`]\s*\)\s*\.\s*(insert|update|delete|upsert)\b/;
const bad = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && forbidden.test(fs.readFileSync(p, 'utf8'))) bad.push(p);
  }
};
walk(path.join(root, 'src'));
assert.deepEqual(bad, [], `client writes wallet tables: ${bad.join(', ')}`);

console.log('check-wallet: ok');
