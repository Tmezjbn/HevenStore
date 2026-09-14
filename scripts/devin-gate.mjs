#!/usr/bin/env node
// Devin lifecycle gate (.devin/hooks.v1.json):
//   PreToolUse(exec)        -> block catastrophic commands
//   PostToolUse(edit|write) -> re-run check-checkout-authority when a sensitive file changed

export const SENSITIVE =
  /(checkout|auth|fulfill|order|role|rls|support|polar|payment|refund|coupon|profile|cart|supabase[\\/])/i;

export const BLOCKED = [
  { re: /\brm\s+-[a-z]*r[a-z]*f[a-z]*\s+(\/|~|\.|\*|$)/i, why: 'recursive force-delete on a broad target' },
  { re: /\bgit\s+push\b[^;]*\s(--force|-f)(\s|$)/i, why: 'force push rewrites remote history' },
  { re: /\b(drop|truncate)\s+(table|database|schema)\b/i, why: 'destructive SQL' },
  { re: /\bsupabase\s+db\s+(reset|push)\b/i, why: 'writes to the linked remote database' },
];

const say = (obj) => console.log(JSON.stringify(obj));

let raw = '';
for await (const c of process.stdin) raw += c;

let p;
try {
  p = JSON.parse(raw);
} catch {
  process.exit(0);
}

const input = p.tool_input || {};

if (p.hook_event_name === 'PreToolUse' && p.tool_name === 'exec') {
  const cmd = String(input.command || '');
  const hit = BLOCKED.find((b) => b.re.test(cmd));
  if (hit) {
    say({
      decision: 'block',
      reason: `Blocked by devin-gate: ${hit.why}. If this is really needed, ask the owner to run it manually.`,
    });
  }
  process.exit(0);
}

if (p.hook_event_name === 'PostToolUse' && /^(edit|write|notebook_edit)$/.test(p.tool_name || '')) {
  const file = String(input.file_path || '');
  if (!SENSITIVE.test(file)) process.exit(0);

  const { execSync } = await import('node:child_process');
  const cwd = process.env.DEVIN_PROJECT_DIR || process.cwd();
  try {
    execSync('node scripts/check-checkout-authority.mjs', { cwd, encoding: 'utf8', timeout: 55000 });
    say({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `devin-gate: check-checkout-authority PASS after editing ${file}`,
      },
    });
  } catch (e) {
    const out = String(e.stdout || '') + String(e.stderr || '');
    say({
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `devin-gate: check-checkout-authority FAILED after editing ${file}.\n${out.slice(-1500)}\nFix this before continuing.`,
      },
    });
  }
}
