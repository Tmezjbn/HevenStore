#!/usr/bin/env node
// Verify scripts/devin-gate.mjs hook behavior with canned payloads.
import { execFileSync } from 'node:child_process';

const SCRIPT = 'scripts/devin-gate.mjs';
let failures = 0;

function run(payload) {
  try {
    const out = execFileSync('node', [SCRIPT], { input: JSON.stringify(payload), encoding: 'utf8' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') };
  }
}

function expect(name, payload, test) {
  const { out } = run(payload);
  const json = out.trim() ? JSON.parse(out.trim().split('\n').pop()) : null;
  const ok = test(json);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failures++;
}

const execPayload = (command) => ({ hook_event_name: 'PreToolUse', tool_name: 'exec', tool_input: { command } });
const editPayload = (file_path) => ({ hook_event_name: 'PostToolUse', tool_name: 'edit', tool_input: { file_path } });

expect('blocks rm -rf /', execPayload('rm -rf /'), (j) => j?.decision === 'block');
expect('blocks force push', execPayload('git push origin main --force'), (j) => j?.decision === 'block');
expect('blocks DROP TABLE', execPayload('psql -c "DROP TABLE orders"'), (j) => j?.decision === 'block');
expect('blocks supabase db push', execPayload('supabase db push'), (j) => j?.decision === 'block');
expect('allows npm test', execPayload('npm test'), (j) => j === null);
expect('ignores non-sensitive edit', editPayload('src/pages/Home.tsx'), (j) => j === null);
expect('runs authority check on auth file', editPayload('src/lib/auth.tsx'), (j) =>
  j?.hookSpecificOutput?.additionalContext?.includes('check-checkout-authority'));

if (failures) {
  console.error(`devin-gate: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('devin-gate: all checks passed');
