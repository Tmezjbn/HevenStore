import type { CSSProperties } from 'react';
import type { Product } from '../types';

export type AuraStyle = NonNullable<Product['aura_style']>;

export const AURA_STYLES: {
  id: AuraStyle;
  labelAr: string;
  labelEn: string;
  className: string;
}[] = [
  { id: 'none', labelAr: 'بدون', labelEn: 'None', className: '' },
  { id: 'default', labelAr: 'افتراضي', labelEn: 'Default', className: 'aura aura-sm' },
  { id: 'dual', labelAr: 'مزدوج', labelEn: 'Dual', className: 'aura aura-dual aura-sm' },
  { id: 'rainbow', labelAr: 'قوس قزح', labelEn: 'Rainbow', className: 'aura aura-rainbow aura-sm' },
  { id: 'holo', labelAr: 'هولو', labelEn: 'Holo', className: 'aura aura-holo aura-sm' },
  { id: 'gold', labelAr: 'ذهبي', labelEn: 'Gold', className: 'aura aura-gold aura-sm' },
  { id: 'silver', labelAr: 'فضي', labelEn: 'Silver', className: 'aura aura-silver aura-sm' },
  { id: 'glow', labelAr: 'توهج', labelEn: 'Glow', className: 'aura aura-glow aura-sm' },
  {
    id: 'electric',
    labelAr: 'كهربائي',
    labelEn: 'Electric',
    className: 'aura aura-electric aura-sm',
  },
];

/** Presets that ignore `currentColor` — custom tint needs CSS override. */
const AURA_FIXED_PALETTE = new Set<AuraStyle>(['rainbow', 'holo', 'gold', 'silver']);

export const DEFAULT_AURA_COLOR = '#f59e0b';
/** Default stroke for electric aura (React Bits–style teal). */
export const DEFAULT_ELECTRIC_AURA_COLOR = '#2dd4bf';

/** React Bits Electric Border knobs (canvas). Match AuraFrame storefront defaults. */
export type ElectricAuraTune = {
  speed: number;
  chaos: number;
  thickness: number;
};

export const DEFAULT_ELECTRIC_AURA_TUNE: ElectricAuraTune = {
  speed: 1,
  chaos: 0.14,
  thickness: 2,
};

export const ELECTRIC_SPEED_MIN = 0.25;
export const ELECTRIC_SPEED_MAX = 3;
export const ELECTRIC_CHAOS_MIN = 0.04;
export const ELECTRIC_CHAOS_MAX = 0.4;
export const ELECTRIC_THICKNESS_MIN = 0.5;
export const ELECTRIC_THICKNESS_MAX = 4;

function clampElectric(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v * 100) / 100));
}

/** Parse products.aura_electric_json (object or JSON string). Empty → defaults. */
export function parseElectricAuraTune(raw: unknown): ElectricAuraTune {
  let o: Record<string, unknown> | null = null;
  if (raw == null || raw === '') return { ...DEFAULT_ELECTRIC_AURA_TUNE };
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object') o = parsed as Record<string, unknown>;
    } catch {
      return { ...DEFAULT_ELECTRIC_AURA_TUNE };
    }
  } else if (typeof raw === 'object') {
    o = raw as Record<string, unknown>;
  }
  if (!o) return { ...DEFAULT_ELECTRIC_AURA_TUNE };
  return {
    speed: clampElectric(
      o.speed,
      ELECTRIC_SPEED_MIN,
      ELECTRIC_SPEED_MAX,
      DEFAULT_ELECTRIC_AURA_TUNE.speed,
    ),
    chaos: clampElectric(
      o.chaos,
      ELECTRIC_CHAOS_MIN,
      ELECTRIC_CHAOS_MAX,
      DEFAULT_ELECTRIC_AURA_TUNE.chaos,
    ),
    thickness: clampElectric(
      o.thickness,
      ELECTRIC_THICKNESS_MIN,
      ELECTRIC_THICKNESS_MAX,
      DEFAULT_ELECTRIC_AURA_TUNE.thickness,
    ),
  };
}

/** Stable jsonb payload for products.aura_electric_json. */
export function serializeElectricAuraTune(tune: ElectricAuraTune): ElectricAuraTune {
  return parseElectricAuraTune(tune);
}

export function electricAuraTuneEqual(a: ElectricAuraTune, b: ElectricAuraTune): boolean {
  return a.speed === b.speed && a.chaos === b.chaos && a.thickness === b.thickness;
}

export function isElectricAura(className: string): boolean {
  return /\baura-electric\b/.test(className);
}

export function auraClass(style: AuraStyle | null | undefined): string {
  return AURA_STYLES.find((s) => s.id === (style ?? 'none'))?.className ?? '';
}

/** Hero-scale aura (no aura-sm). */
export function heroAuraClass(style: AuraStyle | null | undefined): string {
  return auraClass(style).replace(/\baura-sm\b/g, '').replace(/\s+/g, ' ').trim();
}

/** Normalize stored hex; empty/invalid → null (use preset palette). */
export function normalizeAuraColor(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  const hex = v.startsWith('#') ? v : `#${v}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return hex.toLowerCase();
}

export function auraWrapProps(
  style: AuraStyle | null | undefined,
  color?: string | null,
): { className: string; style?: CSSProperties } {
  const className = auraClass(style);
  if (!className) return { className: '' };
  const tint = normalizeAuraColor(color);
  if (!tint) return { className };
  const id = (style ?? 'none') as AuraStyle;
  const override = AURA_FIXED_PALETTE.has(id);
  return {
    className: override ? `${className} aura--custom-tint` : className,
    style: {
      color: tint,
      ['--aura-tint' as string]: tint,
    },
  };
}
