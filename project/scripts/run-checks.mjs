/**
 * Run every scripts/check-*.mjs (used by `npm test`).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const checks = fs
  .readdirSync(dir)
  .filter((f) => f.startsWith('check-') && f.endsWith('.mjs'))
  .sort();

if (checks.length === 0) {
  console.error('No check-*.mjs scripts found');
  process.exit(1);
}

// console.assert only logs in Node — a check using it can never fail the suite.
const decorative = checks.filter((f) =>
  fs.readFileSync(path.join(dir, f), 'utf8').includes('console.assert('),
);
if (decorative.length > 0) {
  console.error(`console.assert never throws; use node:assert in: ${decorative.join(', ')}`);
  process.exit(1);
}

let failed = 0;
for (const file of checks) {
  const result = spawnSync(process.execPath, [path.join(dir, file)], {
    stdio: 'inherit',
    cwd: path.resolve(dir, '..'),
  });
  if (result.status !== 0) failed += 1;
}

if (failed) {
  console.error(`\n${failed}/${checks.length} checks failed`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} checks passed`);
