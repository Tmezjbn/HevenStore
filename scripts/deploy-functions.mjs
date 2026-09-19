// Deploy edge functions to the linked Supabase project.
// Usage:
//   npm run deploy:functions -- polar-checkout hard-delete-user   (named only)
//   npm run deploy:functions                                      (every function)
// SUPABASE_ACCESS_TOKEN comes from .devin/mcp_config.local.json (or env).
// verify_jwt posture is pinned in supabase/config.toml — no flags needed.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const fnsDir = join(root, 'supabase', 'functions');

const named = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const names = named.length
  ? named
  : readdirSync(fnsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .map((d) => d.name);

function envFromFile(path, key) {
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
  }
  return null;
}

// Prefer a full Personal Access Token in .env — the MCP token in
// mcp_config.local.json lacks deploy privileges (management API 403).
let accessToken =
  process.env.SUPABASE_ACCESS_TOKEN ||
  envFromFile(join(root, '.env'), 'SUPABASE_ACCESS_TOKEN');
if (!accessToken) {
  try {
    accessToken = JSON.parse(readFileSync(join(root, '.devin', 'mcp_config.local.json'), 'utf8'))
      .mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN;
  } catch { /* handled below */ }
}
if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN — set env, .env, or .devin/mcp_config.local.json');
  process.exit(1);
}

const localExe = join(process.env.USERPROFILE || '', 'bin', 'supabase.exe');
const cmd = existsSync(localExe) ? localExe : 'supabase';

for (const name of names) {
  console.log(`\n=== deploy ${name} ===`);
  const r = spawnSync(cmd, ['functions', 'deploy', name], {
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: accessToken },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
