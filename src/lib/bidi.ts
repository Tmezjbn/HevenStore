/**
 * User-generated freeform text (reviews, notes, mixed AR/EN).
 * Don't set page `dir` on the whole review row (mirrors avatar/meta).
 *
 * LTR-dominant: `dir="ltr"` + isolate + trailing LRM so trailing "!!!!"
 * stays after Latin words. Never use bidi-override — reverses Arabic glyphs.
 *
 * RTL-dominant (first strong letter Arabic/Hebrew): `ugc-text--rtl-start`
 * → `direction: rtl`, no LRM. Trailing "!!!!" stays at the reading end.
 * Block aligns to page dir: LTR UI → left, RTL UI → right (under avatar).
 */
export const UGC_TEXT_CLASS = 'ugc-text';
export const UGC_DIR = 'ltr' as const;

const LRM = '\u200E';

/** First strong letter is RTL (Arabic/Hebrew/…). Neutrals/digits skipped. */
export function ugcRtlStart(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
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

/** Display-only shaping. Do not persist. */
export function ugcDisplay(text: string): string {
  if (!text) return text;
  if (ugcRtlStart(text)) return text.replace(/\u200E+$/g, '');
  return text.endsWith(LRM) ? text : `${text}${LRM}`;
}

export function ugcAlignClass(text: string): string {
  return ugcRtlStart(text) ? 'ugc-text--rtl-start' : '';
}

export function ugcDir(text: string): 'ltr' | 'rtl' {
  return ugcRtlStart(text) ? 'rtl' : UGC_DIR;
}
