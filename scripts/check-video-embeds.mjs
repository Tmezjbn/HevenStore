/**
 * Multi-embed showcase (ads / no-ads) wiring.
 * Run: node scripts/check-video-embeds.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const mig = read('supabase/migrations/20260720240000_products_video_embeds.sql');
assert.match(mig, /video_embeds jsonb/);

const lib = read('src/lib/videoEmbeds.ts');
assert.match(lib, /export function normalizeVideoEmbeds/);
assert.match(lib, /export function resolveDefaultVideoUrl/);
assert.match(lib, /export function resolveSlotUrl/);
assert.match(lib, /export function resolveEmbedLabel/);
assert.match(lib, /DEFAULT_VIDEO_EMBED_LABELS/);
assert.match(lib, /defaultVariant/);

const types = read('src/types/index.ts');
assert.match(types, /video_embeds\?:/);
assert.match(types, /video_enabled\?:/);

const cols = read('src/hooks/useCatalog.ts');
assert.match(cols, /video_embeds/);
assert.match(cols, /video_enabled/);

const migOn = read('supabase/migrations/20260720260000_products_video_enabled.sql');
assert.match(migOn, /video_enabled boolean/);
assert.match(migOn, /DEFAULT false/);

const editor = read('src/pages/dashboard/ProductEditorPage.tsx');
assert.match(editor, /video_embeds/);
assert.match(editor, /applyEmbedDraft/);
assert.match(editor, /withAds/);
assert.match(editor, /withoutAds/);
assert.match(editor, /pe-media__embed-slot/);
assert.match(editor, /pe-media__embed-labels/);
assert.match(editor, /DEFAULT_VIDEO_EMBED_LABELS/);

const pdp = read('src/pages/ProductDetailPage.tsx');
assert.match(pdp, /normalizeVideoEmbeds/);
assert.match(pdp, /product-showcase-variant/);
assert.match(pdp, /setVideoVariant/);
assert.match(pdp, /filledSlotIndices/);
assert.match(pdp, /resolveEmbedLabel/);
assert.match(pdp, /video_enabled === true/);
assert.doesNotMatch(pdp, /tryAutoFlipPlayer|onFail|autoPlayerFlip/);

assert.match(editor, /video_enabled/);
assert.match(editor, /Show showcase video/);

const player = read('src/components/ui/ProductVideoPlayer.tsx');
assert.match(player, /about:blank/);
assert.match(player, /releaseIframe/);
assert.doesNotMatch(player, /addEventListener\('pagehide'/);
assert.doesNotMatch(player, /onFail|EMBED_STUCK|PLAYBACK_STUCK|onStuck/);

console.log('check-video-embeds: ok');
