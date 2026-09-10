/** Freeform UGC: isolate + LRM for LTR; RTL-start skips LRM + direction:rtl. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LRM = '\u200E';

const bidi = readFileSync(join(root, 'src/lib/bidi.ts'), 'utf8');
assert.match(bidi, /UGC_DIR\s*=\s*'ltr'/);
assert.match(bidi, /export function ugcDisplay/);
assert.match(bidi, /export function ugcRtlStart/);
assert.match(bidi, /\\u200E/);

function ugcRtlStart(text) {
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (
      (code >= 0x0590 && code <= 0x08ff) ||
      (code >= 0xfb1d && code <= 0xfdff) ||
      (code >= 0xfe70 && code <= 0xfefc)
    ) {
      return true;
    }
    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0xc0 && code <= 0x024f)
    ) {
      return false;
    }
  }
  return false;
}

function ugcDisplay(text) {
  if (!text) return text;
  if (ugcRtlStart(text)) return text.replace(/\u200E+$/g, '');
  return text.endsWith(LRM) ? text : `${text}${LRM}`;
}

assert.equal(ugcRtlStart('رهييييييييييب!!!!'), true);
assert.equal(ugcRtlStart('Amazing!!!!'), false);
assert.equal(ugcRtlStart('!!! رهييب'), true);
assert.equal(ugcRtlStart(''), false);

assert.equal(ugcDisplay('رهييب!!!!'), 'رهييب!!!!');
assert.equal(ugcDisplay('رهييب!!!!' + LRM), 'رهييب!!!!');
assert.equal(ugcDisplay('Amazing!!!!').endsWith(LRM), true);
assert.equal(ugcDisplay(''), '');

const css = readFileSync(join(root, 'src/index.css'), 'utf8');
const ugcRule = css.match(/\.ugc-text\s*\{[^}]+\}/)?.[0] ?? '';
assert.match(ugcRule, /unicode-bidi:\s*isolate\s*;/);
assert.doesNotMatch(ugcRule, /override/);
assert.match(css, /textarea\.ugc-text\s*\{[^}]*unicode-bidi:\s*plaintext/);
assert.match(css, /\.pe-reviews__body\s*\{[^}]*text-align:\s*left/);
assert.match(css, /\.ugc-text--rtl-start\s*\{[^}]*direction:\s*rtl/);
assert.match(css, /\.ugc-text--rtl-start\s*\{[^}]*text-align:\s*left/);
assert.match(css, /\[dir=['"]rtl['"]\]\s*\.ugc-text--rtl-start\s*\{[^}]*text-align:\s*right/);
assert.match(css, /\.pe-reviews__body\s*\{[^}]*font-size:\s*1rem/);

const reviews = readFileSync(join(root, 'src/components/product/ProductReviews.tsx'), 'utf8');
assert.match(reviews, /ugcDisplay\(r\.comment\)/);
assert.match(reviews, /ugcAlignClass\(r\.comment\)/);
assert.match(reviews, /ugcDir\(r\.comment\)/);
assert.doesNotMatch(reviews, /ugcBlockDir|dir=\{rowDir\}/);

console.log('check-bidi: ok');
