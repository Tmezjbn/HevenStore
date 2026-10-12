/**
 * Shared helper (not a check): WebsiteBuilderPage entry + every file in
 * src/pages/dashboard/websiteBuilder/ concatenated, so regex checks keep working after the split.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function readBuilderSource(root) {
  const sub = 'src/pages/dashboard/websiteBuilder';
  const files = readdirSync(join(root, sub))
    .filter((f) => /\.tsx?$/.test(f))
    .sort()
    .map((f) => `${sub}/${f}`);
  return ['src/pages/dashboard/WebsiteBuilderPage.tsx', ...files]
    .map((p) => readFileSync(join(root, p), 'utf8'))
    .join('\n');
}
