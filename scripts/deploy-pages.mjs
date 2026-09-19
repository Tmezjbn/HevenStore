// Build + deploy dist/ to Cloudflare Pages (Direct Upload project).
// Secrets come from gitignored .env — nothing is hardcoded:
//   CLOUDFLARE_API_TOKEN   <- Account API token (Edit Cloudflare Workers template)
//   CLOUDFLARE_ACCOUNT_ID  <- Dashboard > Workers & Pages > right sidebar
//   CF_PAGES_PROJECT       <- optional, defaults to 'heven'
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

const envFile = join(root, '.env');
const token = process.env.CLOUDFLARE_API_TOKEN || envFromFile(envFile, 'CLOUDFLARE_API_TOKEN');
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || envFromFile(envFile, 'CLOUDFLARE_ACCOUNT_ID');
const project = process.env.CF_PAGES_PROJECT || envFromFile(envFile, 'CF_PAGES_PROJECT') || 'heven';

for (const [k, v] of [['CLOUDFLARE_API_TOKEN', token], ['CLOUDFLARE_ACCOUNT_ID', accountId]]) {
  if (!v) { console.error(`Missing ${k} — add it to .env`); process.exit(1); }
}
if (!existsSync(join(root, 'dist', 'index.html'))) {
  console.error('dist/ missing — run `npm run build` first');
  process.exit(1);
}

const r = spawnSync('npx', ['-y', 'wrangler', 'pages', 'deploy', 'dist', '--project-name', project, '--commit-dirty=true'], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId },
});
process.exit(r.status ?? 1);
