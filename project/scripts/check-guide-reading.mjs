/**
 * Assert guide reading helpers + GuidesPage wiring stay honest.
 * Run: node scripts/check-guide-reading.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function mustInclude(rel, needle) {
  const text = readFileSync(join(root, rel), 'utf8');
  if (!text.includes(needle)) {
    console.error(`FAIL ${rel}: missing ${JSON.stringify(needle)}`);
    process.exit(1);
  }
}

/** Mirror of src/lib/guideReading.ts — keep in sync. */
function pickReadingSection(sections, lineY, viewTop, viewBottom) {
  let best = null;
  let bestDist = Infinity;
  for (const s of sections) {
    if (s.bottom <= viewTop || s.top >= viewBottom) continue;
    const dist = Math.abs(s.top - lineY);
    if (dist < bestDist) {
      bestDist = dist;
      best = s.id;
    }
  }
  return best;
}

const viewTop = 0;
const viewBottom = 600;
const lineY = 180;
const sections = [
  { id: 'a', top: -200, bottom: 100 },
  { id: 'b', top: 120, bottom: 400 },
  { id: 'c', top: 420, bottom: 700 },
  { id: 'd', top: 800, bottom: 1000 },
];

const picked = pickReadingSection(sections, lineY, viewTop, viewBottom);
if (picked !== 'b') {
  console.error(`FAIL pickReadingSection: expected b, got ${picked}`);
  process.exit(1);
}
if (pickReadingSection([], lineY, viewTop, viewBottom) !== null) {
  console.error('FAIL pickReadingSection: empty → null');
  process.exit(1);
}

mustInclude('src/lib/guideReading.ts', 'export function pickReadingSection');
mustInclude('src/lib/guideReading.ts', 'heven.guides.read');
mustInclude('src/pages/dashboard/GuidesPage.tsx', 'pickReadingSection');
mustInclude('src/pages/dashboard/GuidesPage.tsx', 'toggleRead');
mustInclude('src/pages/dashboard/GuidesPage.tsx', 'markAllRead');
mustInclude('src/pages/dashboard/GuidesPage.tsx', 'loadGuideReadIds');
mustInclude('src/pages/dashboard/GuidesPage.tsx', 'saveGuideReadIds');

console.log('ok check-guide-reading');
