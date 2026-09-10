// Skin = a distinct visual look. Each skin has a dark and light DaisyUI theme.
// Content stays identical across skins; only the feel changes.

export type SkinId = 'vault' | 'aurora' | 'sunset' | 'abyss' | 'dim' | 'coffee';
export type Mode = 'dark' | 'light';

export interface Skin {
  id: SkinId;
  labelAr: string;
  labelEn: string;
  darkTheme: string;
  lightTheme: string;
  // Swatch shown in the switcher (dark variant primary/base).
  swatch: { primary: string; base: string };
}

export const SKINS: Skin[] = [
  {
    id: 'vault',
    labelAr: 'الخزنة',
    labelEn: 'Vault',
    darkTheme: 'heven',
    lightTheme: 'heven-light',
    swatch: { primary: '#1c1c28', base: '#e4e8f0' },
  },
  {
    id: 'aurora',
    labelAr: 'الشفق',
    labelEn: 'Aurora',
    darkTheme: 'aurora',
    lightTheme: 'aurora-light',
    swatch: { primary: '#818cf8', base: '#0b0b16' },
  },
  {
    id: 'sunset',
    labelAr: 'الغروب',
    labelEn: 'Sunset',
    darkTheme: 'sunset',
    lightTheme: 'sunset-light',
    swatch: { primary: '#fb7185', base: '#160f10' },
  },
  {
    id: 'abyss',
    labelAr: 'هاوية',
    labelEn: 'Abyss',
    darkTheme: 'abyss',
    lightTheme: 'abyss-light',
    swatch: { primary: '#c8ff2e', base: '#0a2a32' },
  },
  {
    id: 'dim',
    labelAr: 'خافت',
    labelEn: 'Dim',
    darkTheme: 'dim',
    lightTheme: 'dim-light',
    swatch: { primary: '#a3e635', base: '#2a303c' },
  },
  {
    id: 'coffee',
    labelAr: 'قهوة',
    labelEn: 'Coffee',
    darkTheme: 'coffee',
    lightTheme: 'coffee-light',
    swatch: { primary: '#db924b', base: '#20161f' },
  },
];

export const DEFAULT_SKIN: SkinId = 'vault';
export const DEFAULT_MODE: Mode = 'dark';

/** Short bilingual blurb for each skin (Themes admin). */
export const SKIN_BLURBS: Record<SkinId, { ar: string; en: string }> = {
  vault: {
    ar: 'الخزنة الموثوقة — أحادي هادئ، ضوء بارد.',
    en: 'The Trusted Vault — cool monochrome, calm and premium.',
  },
  aurora: {
    ar: 'شفق بنفسجي — ليلي وحيوي.',
    en: 'Indigo aurora — night glow, soft energy.',
  },
  sunset: {
    ar: 'غروب وردي دافئ — جريء وودّي.',
    en: 'Warm rose sunset — bold and inviting.',
  },
  abyss: {
    ar: 'هاوية عميقة — تباين حاد، ليموني.',
    en: 'Deep abyss — sharp contrast, acid lime.',
  },
  dim: {
    ar: 'خافت رمادي — هادئ ومنخفض التوهج.',
    en: 'Soft dim — muted surfaces, low glare.',
  },
  coffee: {
    ar: 'قهوة دافئة — بني غني ومريح.',
    en: 'Rich coffee — warm browns, cozy feel.',
  },
};

const VALID_SKINS = new Set<string>(SKINS.map((s) => s.id));

/** Migrate legacy skin ids persisted in localStorage. */
export function normalizeSkinId(id: string | undefined | null): SkinId {
  if (id === 'mono') return 'abyss';
  if (id && VALID_SKINS.has(id)) return id as SkinId;
  return DEFAULT_SKIN;
}

export function resolveTheme(skinId: SkinId, mode: Mode): string {
  const skin = SKINS.find((s) => s.id === skinId) ?? SKINS[0];
  return mode === 'dark' ? skin.darkTheme : skin.lightTheme;
}
