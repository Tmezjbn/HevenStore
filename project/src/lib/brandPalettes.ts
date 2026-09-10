export type BrandPaletteId =
  | 'default'
  | 'vault'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'ocean';

export interface BrandPalette {
  id: BrandPaletteId;
  labelAr: string;
  labelEn: string;
  primary: string;
  accent: string;
}

/** Owner presets — custom hex still available via color pickers. */
export const BRAND_PALETTES: BrandPalette[] = [
  {
    id: 'default',
    labelAr: 'افتراضي (مظهر الحالي)',
    labelEn: 'Default (current look)',
    primary: '',
    accent: '',
  },
  {
    id: 'vault',
    labelAr: 'تركواز الخزنة',
    labelEn: 'Vault Teal',
    primary: '#2dd4bf',
    accent: '#22d3ee',
  },
  {
    id: 'emerald',
    labelAr: 'زمردي',
    labelEn: 'Emerald',
    primary: '#10b981',
    accent: '#6ee7b7',
  },
  {
    id: 'violet',
    labelAr: 'بنفسجي',
    labelEn: 'Violet',
    primary: '#7c3aed',
    accent: '#a78bfa',
  },
  {
    id: 'rose',
    labelAr: 'وردي',
    labelEn: 'Rose',
    primary: '#e11d48',
    accent: '#fb7185',
  },
  {
    id: 'ocean',
    labelAr: 'محيط',
    labelEn: 'Ocean',
    primary: '#0284c7',
    accent: '#38bdf8',
  },
];

export function findBrandPalette(id: string): BrandPalette | undefined {
  return BRAND_PALETTES.find((p) => p.id === id);
}
