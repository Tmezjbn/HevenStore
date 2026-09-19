// Push pending migrations to the linked Supabase project.
// Secrets come from gitignored local files — nothing is hardcoded:
//   SUPABASE_DB_PASSWORD    <- .env (Dashboard > Settings > Database)
//   SUPABASE_ACCESS_TOKEN   <- .devin/mcp_config.local.json (or env)
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();

function envFromFile(path, key) {
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
    if (m && m[1] === key) return m[2].replace(/^["']|["']$/g, '');
  }
  return null;
}

const dbPassword =
  process.env.SUPABASE_DB_PASSWORD ||
  envFromFile(join(root, '.env'), 'SUPABASE_DB_PASSWORD');

let accessToken = process.env.SUPABASE_ACCESS_TOKEN;
if (!accessToken) {
  const cfg = join(root, '.devin', 'mcp_config.local.json');
  try {
    accessToken = JSON.parse(readFileSync(cfg, 'utf8')).mcpServers?.supabase?.env?.SUPABASE_ACCESS_TOKEN;
  } catch { /* fall through to the error below */ }
}

if (!dbPassword) {
  console.error('Missing SUPABASE_DB_PASSWORD — add it to .env');
  console.error('(Dashboard → Project Settings → Database → Database password)');
  process.exit(1);
}
if (!accessToken) {
  console.error('Missing SUPABASE_ACCESS_TOKEN — set the env var or .devin/mcp_config.local.json');
  process.exit(1);
}

const localExe = join(process.env.USERPROFILE || '', 'bin', 'supabase.exe');
const cmd = existsSync(localExe) ? localExe : 'supabase';
const r = spawnSync(cmd, ['db', 'push'], {
  stdio: 'inherit',
  env: { ...process.env, SUPABASE_DB_PASSWORD: dbPassword, SUPABASE_ACCESS_TOKEN: accessToken },
});
process.exit(r.status ?? 1);
