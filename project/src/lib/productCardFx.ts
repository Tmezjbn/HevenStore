import { ATMOSPHERE_LOGO_IDS } from './atmosphereLogos';

/** Legacy `pulse` kept out of the picker — normalize maps it to none. */
export type CardFxStyle = 'none' | 'matrix' | 'logo' | 'scan' | 'sheen' | 'embers' | 'rift';
/** Matrix rain travel: down = classic fall; up = rise. */
export type CardFxMatrixDir = 'down' | 'up';
/** 1 = canvas rain (light), 2 = DOM glyph columns (rich), 3 = letter glitch. */
export type CardFxMatrixType = 1 | 2 | 3;

export type ProductCardFx = {
  style: CardFxStyle;
  /** Tint for color-driven styles (CSS hex). */
  color?: string;
  /** Second stop when `gradient` is on (or glitch color 2 when matrixType 3). */
  color2?: string;
  /** Matrix type 3 — third letter-glitch color. */
  color3?: string;
  /** Blend color → color2 across the effect. */
  gradient?: boolean;
  /**
   * When gradient on: animate colors.
   * Matrix → chroma wave across rain letters; other FX → soft L↔R wash.
   */
  gradientShift?: boolean;
  /** Matrix only — rain direction. Default down. */
  matrixDir?: CardFxMatrixDir;
  /** Matrix only — column count (streams). Default 36. */
  matrixCols?: number;
  /** Matrix only — letters per stream / trail length. Default 14. */
  matrixLetters?: number;
  /** Matrix only — rain speed 1–10. Default 5. */
  matrixSpeed?: number;
  /** Matrix only — renderer. Default 1 (canvas). */
  matrixType?: CardFxMatrixType;
  /** Matrix type 3 — glitch interval ms. Default 50. */
  matrixGlitchSpeed?: number;
  /** Matrix type 3 — smooth color lerp. Default true; persist only when false. */
  matrixGlitchSmooth?: boolean;
  /** Matrix type 3 — outer vignette. Default true; persist only when false. */
  matrixOuterVignette?: boolean;
  /** Matrix type 3 — center vignette. Default false. */
  matrixCenterVignette?: boolean;
  /** Matrix type 3 — character set for glitch cells. */
  matrixGlitchChars?: string;
  /** Atmosphere catalog logo id when style=logo. */
  logoId?: string;
};

export const DEFAULT_MATRIX_TYPE: CardFxMatrixType = 1;

export const CARD_FX_STYLES: {
  id: CardFxStyle;
  labelAr: string;
  labelEn: string;
  needsColor?: boolean;
  needsLogo?: boolean;
}[] = [
  { id: 'none', labelAr: 'بدون', labelEn: 'None' },
  { id: 'matrix', labelAr: 'ماتريكس', labelEn: 'Matrix', needsColor: true },
  { id: 'logo', labelAr: 'شعار لعبة', labelEn: 'Game logo', needsLogo: true },
  { id: 'scan', labelAr: 'خطوط مسح', labelEn: 'Scanlines', needsColor: true },
  { id: 'sheen', labelAr: 'لمعان', labelEn: 'Sheen', needsColor: true },
  { id: 'embers', labelAr: 'جمرات', labelEn: 'Embers', needsColor: true },
  { id: 'rift', labelAr: 'شق', labelEn: 'Rift', needsColor: true },
];

export const DEFAULT_CARD_FX_COLOR = '#22c55e';
export const DEFAULT_CARD_FX_COLOR2 = '#06b6d4';
/** Letter Glitch third stop (React Bits default teal). */
export const DEFAULT_CARD_FX_COLOR3 = '#61b3dc';
export const DEFAULT_MATRIX_COLS = 36;
export const MATRIX_COLS_MIN = 8;
export const MATRIX_COLS_MAX = 56;
export const DEFAULT_MATRIX_LETTERS = 14;
export const MATRIX_LETTERS_MIN = 6;
export const MATRIX_LETTERS_MAX = 40;
export const DEFAULT_MATRIX_SPEED = 5;
export const MATRIX_SPEED_MIN = 1;
export const MATRIX_SPEED_MAX = 10;
/** Letter Glitch — interval ms (React Bits default 50). */
export const DEFAULT_GLITCH_SPEED = 50;
export const GLITCH_SPEED_MIN = 10;
export const GLITCH_SPEED_MAX = 200;
export const DEFAULT_GLITCH_SMOOTH = true;
export const DEFAULT_GLITCH_OUTER_VIGNETTE = true;
export const DEFAULT_GLITCH_CENTER_VIGNETTE = false;
export const DEFAULT_GLITCH_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789';
export const GLITCH_CHARS_MAX = 120;

/** Safe matrix stream count for card-body rain. */
export function clampMatrixCols(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_MATRIX_COLS;
  return Math.min(MATRIX_COLS_MAX, Math.max(MATRIX_COLS_MIN, Math.round(v)));
}

/** Safe letters-per-stream for matrix rain (canvas trail / DOM stack). */
export function clampMatrixLetters(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_MATRIX_LETTERS;
  return Math.min(MATRIX_LETTERS_MAX, Math.max(MATRIX_LETTERS_MIN, Math.round(v)));
}

/** Safe rain speed 1–10. */
export function clampMatrixSpeed(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_MATRIX_SPEED;
  return Math.min(MATRIX_SPEED_MAX, Math.max(MATRIX_SPEED_MIN, Math.round(v)));
}

/** Pace multiplier vs default (5 → 1×). */
export function matrixSpeedFactor(speed: unknown): number {
  return clampMatrixSpeed(speed) / DEFAULT_MATRIX_SPEED;
}

/** Safe letter-glitch interval ms. */
export function clampGlitchSpeed(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return DEFAULT_GLITCH_SPEED;
  return Math.min(GLITCH_SPEED_MAX, Math.max(GLITCH_SPEED_MIN, Math.round(v)));
}

/** Safe glitch charset (non-empty, capped). */
export function clampGlitchChars(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_GLITCH_CHARS;
  const s = raw.replace(/\s/g, '').slice(0, GLITCH_CHARS_MAX);
  return s.length > 0 ? s : DEFAULT_GLITCH_CHARS;
}

/** Color list for matrix type 3 (Letter Glitch). */
export function matrixGlitchColors(fx: ProductCardFx): string[] {
  const c1 = fx.color ?? DEFAULT_CARD_FX_COLOR;
  const c2 = fx.color2 ?? DEFAULT_CARD_FX_COLOR2;
  const c3 = fx.color3 ?? DEFAULT_CARD_FX_COLOR3;
  return [c1, c2, c3];
}

const STYLE_SET = new Set<CardFxStyle>(CARD_FX_STYLES.map((s) => s.id));

const COLOR_STYLES: ReadonlySet<CardFxStyle> = new Set([
  'matrix',
  'scan',
  'sheen',
  'embers',
  'rift',
]);

function isHexColor(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v.trim());
}

function expandHex(v: string): { r: number; g: number; b: number } | null {
  const h = v.trim();
  const m3 = /^#([0-9a-fA-F]{3})$/.exec(h);
  if (m3) {
    const [r, g, b] = m3[1].split('').map((c) => parseInt(c + c, 16));
    return { r: r!, g: g!, b: b! };
  }
  const m6 = /^#([0-9a-fA-F]{6})/.exec(h);
  if (!m6) return null;
  const n = parseInt(m6[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Lerp two hex colors (t 0–1). Used for matrix column tints. */
export function mixHexColors(a: string, b: string, t: number): string {
  const pa = expandHex(a);
  const pb = expandHex(b);
  if (!pa || !pb) return a;
  const u = Math.min(1, Math.max(0, t));
  const m = (x: number, y: number) => Math.round(x + (y - x) * u);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(m(pa.r, pb.r))}${hex(m(pa.g, pb.g))}${hex(m(pa.b, pb.b))}`;
}

/** Coerce DB / form JSON into a safe card FX config. */
export function normalizeCardFx(raw: unknown): ProductCardFx {
  if (!raw || typeof raw !== 'object') return { style: 'none' };
  const o = raw as Record<string, unknown>;
  // Drop retired pulse (and anything unknown).
  if (o.style === 'pulse') return { style: 'none' };
  const style =
    typeof o.style === 'string' && STYLE_SET.has(o.style as CardFxStyle)
      ? (o.style as CardFxStyle)
      : 'none';
  if (style === 'none') return { style: 'none' };

  const color =
    typeof o.color === 'string' && isHexColor(o.color) ? o.color.trim() : DEFAULT_CARD_FX_COLOR;
  const color2 =
    typeof o.color2 === 'string' && isHexColor(o.color2) ? o.color2.trim() : DEFAULT_CARD_FX_COLOR2;
  const color3 =
    typeof o.color3 === 'string' && isHexColor(o.color3) ? o.color3.trim() : DEFAULT_CARD_FX_COLOR3;
  const gradient = o.gradient === true;
  const gradientShift = gradient && o.gradientShift === true;
  const matrixDir: CardFxMatrixDir | undefined =
    style === 'matrix' && o.matrixDir === 'up' ? 'up' : undefined;
  const matrixCols =
    style === 'matrix' && o.matrixCols != null
      ? clampMatrixCols(o.matrixCols)
      : undefined;
  const matrixLetters =
    style === 'matrix' && o.matrixLetters != null
      ? clampMatrixLetters(o.matrixLetters)
      : undefined;
  const matrixSpeed =
    style === 'matrix' && o.matrixSpeed != null
      ? clampMatrixSpeed(o.matrixSpeed)
      : undefined;
  let matrixType: CardFxMatrixType | undefined;
  if (style === 'matrix') {
    if (o.matrixType === 3 || o.matrixType === '3') matrixType = 3;
    else if (o.matrixType === 2 || o.matrixType === '2') matrixType = 2;
  }
  const matrixGlitchSpeed =
    style === 'matrix' && matrixType === 3 && o.matrixGlitchSpeed != null
      ? clampGlitchSpeed(o.matrixGlitchSpeed)
      : undefined;
  const matrixGlitchSmooth =
    style === 'matrix' && matrixType === 3 && o.matrixGlitchSmooth === false ? false : undefined;
  const matrixOuterVignette =
    style === 'matrix' && matrixType === 3 && o.matrixOuterVignette === false ? false : undefined;
  const matrixCenterVignette =
    style === 'matrix' && matrixType === 3 && o.matrixCenterVignette === true ? true : undefined;
  const matrixGlitchChars =
    style === 'matrix' && matrixType === 3 && typeof o.matrixGlitchChars === 'string'
      ? clampGlitchChars(o.matrixGlitchChars)
      : undefined;
  const logoId =
    typeof o.logoId === 'string' &&
    ATMOSPHERE_LOGO_IDS.includes(o.logoId as (typeof ATMOSPHERE_LOGO_IDS)[number])
      ? o.logoId
      : 'fortnite';

  if (style === 'logo') return { style, logoId };
  if (COLOR_STYLES.has(style)) {
    const isGlitch = matrixType === 3;
    const matrixExtras = {
      ...(matrixType === 2 || matrixType === 3 ? { matrixType } : {}),
      // Type 1/2 rain knobs — omit for glitch (type 3).
      ...(!isGlitch && matrixDir ? { matrixDir } : {}),
      ...(!isGlitch && matrixCols != null && matrixCols !== DEFAULT_MATRIX_COLS
        ? { matrixCols }
        : {}),
      ...(!isGlitch && matrixLetters != null && matrixLetters !== DEFAULT_MATRIX_LETTERS
        ? { matrixLetters }
        : {}),
      ...(!isGlitch && matrixSpeed != null && matrixSpeed !== DEFAULT_MATRIX_SPEED
        ? { matrixSpeed }
        : {}),
      ...(isGlitch &&
      matrixGlitchSpeed != null &&
      matrixGlitchSpeed !== DEFAULT_GLITCH_SPEED
        ? { matrixGlitchSpeed }
        : {}),
      ...(isGlitch && matrixGlitchSmooth === false ? { matrixGlitchSmooth: false as const } : {}),
      ...(isGlitch && matrixOuterVignette === false
        ? { matrixOuterVignette: false as const }
        : {}),
      ...(isGlitch && matrixCenterVignette ? { matrixCenterVignette: true as const } : {}),
      ...(isGlitch &&
      matrixGlitchChars != null &&
      matrixGlitchChars !== DEFAULT_GLITCH_CHARS
        ? { matrixGlitchChars }
        : {}),
      ...(isGlitch && color3 !== DEFAULT_CARD_FX_COLOR3 ? { color3 } : {}),
    };
    // Type 3 always keeps color2 (glitch palette); gradient unused.
    if (isGlitch) {
      return { style, color, color2, ...matrixExtras };
    }
    if (!gradient) return { style, color, ...matrixExtras };
    return {
      style,
      color,
      color2,
      gradient: true,
      ...(gradientShift ? { gradientShift: true } : {}),
      ...matrixExtras,
    };
  }
  return { style: 'none' };
}

export function cardFxActive(fx: ProductCardFx): boolean {
  return fx.style !== 'none';
}

/** Payload for Supabase — always a plain object. */
export function serializeCardFx(fx: ProductCardFx): ProductCardFx {
  return normalizeCardFx(fx);
}

// ponytail: ceiling = RGB lerp; upgrade = OKLCH mix in CSS when widely supported
if (import.meta.env.DEV) {
  console.assert(mixHexColors('#000000', '#ffffff', 0.5) === '#808080', 'mixHex mid');
  console.assert(normalizeCardFx({ style: 'matrix', gradient: true }).gradient === true);
  console.assert(
    normalizeCardFx({ style: 'matrix', gradient: true, gradientShift: true }).gradientShift ===
      true,
  );
  console.assert(normalizeCardFx({ style: 'matrix', matrixDir: 'up' }).matrixDir === 'up');
  console.assert(normalizeCardFx({ style: 'matrix', matrixDir: 'down' }).matrixDir === undefined);
  console.assert(normalizeCardFx({ style: 'scan', matrixDir: 'up' }).matrixDir === undefined);
  console.assert(clampMatrixCols(3) === MATRIX_COLS_MIN);
  console.assert(clampMatrixCols(99) === MATRIX_COLS_MAX);
  console.assert(normalizeCardFx({ style: 'matrix', matrixCols: 20 }).matrixCols === 20);
  console.assert(normalizeCardFx({ style: 'matrix', matrixCols: 36 }).matrixCols === undefined);
  console.assert(clampMatrixLetters(2) === MATRIX_LETTERS_MIN);
  console.assert(clampMatrixLetters(99) === MATRIX_LETTERS_MAX);
  console.assert(normalizeCardFx({ style: 'matrix', matrixLetters: 20 }).matrixLetters === 20);
  console.assert(normalizeCardFx({ style: 'matrix', matrixLetters: 14 }).matrixLetters === undefined);
  console.assert(clampMatrixSpeed(0) === MATRIX_SPEED_MIN);
  console.assert(clampMatrixSpeed(99) === MATRIX_SPEED_MAX);
  console.assert(matrixSpeedFactor(5) === 1);
  console.assert(normalizeCardFx({ style: 'matrix', matrixSpeed: 8 }).matrixSpeed === 8);
  console.assert(normalizeCardFx({ style: 'matrix', matrixSpeed: 5 }).matrixSpeed === undefined);
  console.assert(normalizeCardFx({ style: 'matrix', matrixType: 2 }).matrixType === 2);
  console.assert(normalizeCardFx({ style: 'matrix', matrixType: 1 }).matrixType === undefined);
  console.assert(normalizeCardFx({ style: 'matrix', matrixType: 3 }).matrixType === 3);
  console.assert(clampGlitchSpeed(5) === GLITCH_SPEED_MIN);
  console.assert(clampGlitchSpeed(999) === GLITCH_SPEED_MAX);
  console.assert(
    normalizeCardFx({ style: 'matrix', matrixType: 3, matrixGlitchSpeed: 50 }).matrixGlitchSpeed ===
      undefined,
  );
  console.assert(
    normalizeCardFx({ style: 'matrix', matrixType: 3, matrixGlitchSmooth: false })
      .matrixGlitchSmooth === false,
  );
  console.assert(
    normalizeCardFx({ style: 'matrix', matrixType: 3, matrixCenterVignette: true })
      .matrixCenterVignette === true,
  );
  console.assert(
    normalizeCardFx({ style: 'matrix', matrixType: 3, matrixDir: 'up' }).matrixDir === undefined,
  );
  console.assert(matrixGlitchColors({ style: 'matrix' }).length === 3);
}
