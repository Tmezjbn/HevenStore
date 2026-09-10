// Convert a hex color to the `L% C H` triplet DaisyUI expects inside oklch(var(--x)).
// Dependency-free sRGB -> linear -> OKLab -> OKLCH.

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function parseHex(hex: string): [number, number, number] | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export interface Oklch {
  l: number; // 0..1
  c: number;
  h: number; // degrees
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;

  const r = srgbToLinear(rgb[0]);
  const g = srgbToLinear(rgb[1]);
  const b = srgbToLinear(rgb[2]);

  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l: L, c, h };
}

function round(n: number, p = 4): number {
  const f = Math.pow(10, p);
  return Math.round(n * f) / f;
}

// DaisyUI variable triplet, e.g. "63.2% 0.19 275.8"
export function oklchTriplet(o: Oklch): string {
  return `${round(o.l * 100, 2)}% ${round(o.c)} ${round(o.h, 2)}`;
}

// Pick readable content color (near-black / near-white) for a given base.
export function contentTriplet(o: Oklch): string {
  return o.l > 0.6 ? '18% 0.02 0' : '98% 0.01 0';
}

export function hexToDaisyVars(hex: string): { base: string; content: string } | null {
  const o = hexToOklch(hex);
  if (!o) return null;
  return { base: oklchTriplet(o), content: contentTriplet(o) };
}
