/**
 * Phase 8 cleanup invariants — dead shadcn gone, live ui kept, no orphan radix.
 * Run: node scripts/check-cleanup.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiDir = path.join(root, 'src/components/ui');
const keep = new Set([
  'AppBootGate.tsx',
  'AvatarUploader.tsx',
  'BackToTop.tsx',
  'BadgeIcon.tsx',
  'BrandLogo.tsx',
  'DiscountBadge.tsx',
  'ElectricBorder.tsx',
  'Hover3dZones.tsx',
  'LetterGlitchCanvas.tsx',
  'MatrixRainCanvas.tsx',
  'Modal.tsx',
  'ProductCard.tsx',
  'ProductCardBodyFx.tsx',
  'ProductMedia.tsx',
  'ProductVideoPlayer.tsx',
  'ProfileBadgeStrip.tsx',
  'RatingStars.tsx',
  'Reveal.tsx',
  'RouteLoadingScreen.tsx',
  'ScrollToTop.tsx',
  'SearchFxShell.tsx',
  'UserAvatar.tsx',
]);

const files = fs.readdirSync(uiDir).filter((f) => f.endsWith('.tsx'));
for (const f of files) {
  assert.ok(keep.has(f), `unexpected ui file still present: ${f}`);
}
for (const f of keep) {
  assert.ok(files.includes(f), `live ui file missing: ${f}`);
}

assert.ok(!fs.existsSync(path.join(root, 'src/hooks/use-toast.ts')), 'use-toast.ts should be gone');
assert.ok(!fs.existsSync(path.join(root, 'src/lib/utils.ts')), 'lib/utils.ts should be gone');
assert.ok(!fs.existsSync(path.join(root, 'components.json')), 'components.json should be gone');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
for (const bad of [
  '@radix-ui/react-dialog',
  'class-variance-authority',
  'cmdk',
  'vaul',
  'sonner',
  'zod',
  'react-hook-form',
  'tailwind-merge',
  'clsx',
]) {
  assert.ok(!(bad in deps), `dead dependency still listed: ${bad}`);
}
for (const good of ['react', 'daisyui', 'framer-motion', 'zustand', '@supabase/supabase-js', 'recharts', 'plyr']) {
  assert.ok(good in deps, `expected dependency missing: ${good}`);
}

console.log(`check-cleanup: ok (${files.length} live ui files, dead shadcn purged)`);
