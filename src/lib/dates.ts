/**
 * Shared date formatting. Arabic uses the Gregorian calendar + Latin digits
 * (`ar-SA` defaults to Hijri), and Intl's Arabic output carries RLM/ALM marks
 * that scramble the date inside our always-LTR layout (`13/9/2026` →
 * `132026/9/`) — strip them.
 */
type Lang = 'ar' | 'en' | string;
type DateInput = string | number | Date;

const BIDI_MARKS = /[\u200e\u200f\u061c]/g;

export function dateLocale(lang: Lang): string {
  return lang === 'ar' ? 'ar-u-ca-gregory-nu-latn' : 'en-US';
}

const clean = (s: string) => s.replace(BIDI_MARKS, '');

export function fmtDate(v: DateInput, lang: Lang, opts?: Intl.DateTimeFormatOptions): string {
  return clean(new Date(v).toLocaleDateString(dateLocale(lang), opts));
}

export function fmtDateTime(v: DateInput, lang: Lang, opts?: Intl.DateTimeFormatOptions): string {
  return clean(new Date(v).toLocaleString(dateLocale(lang), opts));
}

export function fmtTime(v: DateInput, lang: Lang, opts?: Intl.DateTimeFormatOptions): string {
  return clean(new Date(v).toLocaleTimeString(dateLocale(lang), opts));
}
