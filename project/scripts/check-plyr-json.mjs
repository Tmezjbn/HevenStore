/** Mirrors parsePlyrConfig defaults — fails if parse logic drifts. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PLYR_CONTROL_OPTIONS = [
  'play',
  'progress',
  'current-time',
  'mute',
  'volume',
  'fullscreen',
];

const DEFAULT = {
  enabled: true,
  accent: '#2dd4bf',
  controls: [...PLYR_CONTROL_OPTIONS],
  seekTooltips: true,
};

function parsePlyrConfig(raw) {
  if (!raw.trim()) return { ...DEFAULT, controls: [...DEFAULT.controls] };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT, controls: [...DEFAULT.controls] };
    }
    const controlsRaw = Array.isArray(parsed.controls) ? parsed.controls : DEFAULT.controls;
    const controls = controlsRaw.filter(
      (c) => typeof c === 'string' && PLYR_CONTROL_OPTIONS.includes(c),
    );
    return {
      enabled: parsed.enabled !== false,
      accent:
        typeof parsed.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.accent.trim())
          ? parsed.accent.trim()
          : DEFAULT.accent,
      controls: controls.length > 0 ? controls : [...DEFAULT.controls],
      seekTooltips: parsed.seekTooltips !== false,
    };
  } catch {
    return { ...DEFAULT, controls: [...DEFAULT.controls] };
  }
}

const d = parsePlyrConfig('');
assert.equal(d.enabled, true);
assert.equal(d.accent, '#2dd4bf');
assert.equal(parsePlyrConfig('not-json').enabled, true);
assert.equal(parsePlyrConfig('{"enabled":false}').enabled, false);
assert.equal(parsePlyrConfig('{"accent":"nope"}').accent, '#2dd4bf');
assert.equal(parsePlyrConfig('{"controls":["play","nope"]}').controls.join(), 'play');

assert.ok(existsSync(join(root, 'public/vendor/plyr.svg')), 'plyr.svg');
const player = readFileSync(join(root, 'src/components/ui/ProductVideoPlayer.tsx'), 'utf8');
assert.match(player, /\/vendor\/plyr\.svg/);
assert.match(player, /onError/);
assert.match(player, /Video unavailable|غير متاح/);
assert.match(player, /player\.on\('ready'/);
assert.match(player, /mute:\s*1/);
assert.match(player, /const isFile = Boolean\(src\) && !provider && !stillImage/);
// Shorts/live/embed URL shapes are parsed in lib/videoEmbed — player only consumes youtubeId.
assert.match(player, /youtubeId\(src\)/);
assert.match(
  readFileSync(join(root, 'src/lib/videoEmbed.ts'), 'utf8'),
  /seg\[0\] === 'embed' \|\| seg\[0\] === 'shorts' \|\| seg\[0\] === 'live'/,
);
assert.match(player, /preview/);
assert.match(player, /PLYR_STUCK_MS/);
assert.match(player, /loadedmetadata/);
assert.match(player, /failKey/);
assert.doesNotMatch(player, /LOAD_FAIL_MS/);

const editor = readFileSync(join(root, 'src/pages/dashboard/ProductEditorPage.tsx'), 'utf8');
assert.match(editor, /ProductVideoPlayer/);
assert.match(editor, /preview/);
assert.match(editor, /src=\{form\.video_url\}/);
assert.doesNotMatch(
  editor,
  /ProductMedia src=\{form\.video_url\}/,
  'editor showcase must use ProductVideoPlayer, not ProductMedia',
);

console.log('plyr_json ok');
