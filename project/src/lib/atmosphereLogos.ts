import type { AtmosphereCustomLogo } from './siteSettings';

export type AtmosphereLogoId =
  | 'rust'
  | 'gta5'
  | 'cod'
  | 'fortnite'
  | 'minecraft'
  | 'valorant'
  | 'roblox'
  | 'lol'
  | 'apex'
  | 'cs2';

export type AtmosphereLogoEntry = {
  id: string;
  labelEn: string;
  labelAr: string;
  src: string;
  /** Built-in geometric mark (not an official trademark). */
  stylized?: boolean;
  /** Force black on light themes / white on dark (CSS filter). Brand marks omit this. */
  themeInk?: boolean;
};

/** Class for theme-ink mono marks; brand-colored SVGs (e.g. Rockstar yellow) pass empty. */
export function atmosphereLogoToneClass(entry: unknown): string {
  return entry &&
    typeof entry === 'object' &&
    'themeInk' in entry &&
    (entry as { themeInk?: boolean }).themeInk
    ? 'atmosphere-logo--ink'
    : '';
}

export const ATMOSPHERE_LOGO_CATALOG: AtmosphereLogoEntry[] = [
  { id: 'rust', labelEn: 'Rust', labelAr: 'Rust', src: '/atmosphere-logos/rust.svg', themeInk: true },
  { id: 'gta5', labelEn: 'Rockstar', labelAr: 'Rockstar', src: '/atmosphere-logos/gta5.svg', themeInk: true },
  { id: 'cod', labelEn: 'COD', labelAr: 'COD', src: '/atmosphere-logos/cod.svg', themeInk: true },
  { id: 'fortnite', labelEn: 'Fortnite', labelAr: 'Fortnite', src: '/atmosphere-logos/fortnite.svg', themeInk: true },
  { id: 'minecraft', labelEn: 'Minecraft', labelAr: 'Minecraft', src: '/atmosphere-logos/minecraft.svg', stylized: true, themeInk: true },
  { id: 'valorant', labelEn: 'Valorant', labelAr: 'Valorant', src: '/atmosphere-logos/valorant.svg', stylized: true, themeInk: true },
  { id: 'roblox', labelEn: 'Roblox', labelAr: 'Roblox', src: '/atmosphere-logos/roblox.svg', stylized: true, themeInk: true },
  { id: 'lol', labelEn: 'League', labelAr: 'League', src: '/atmosphere-logos/lol.svg', stylized: true, themeInk: true },
  { id: 'apex', labelEn: 'Apex', labelAr: 'Apex', src: '/atmosphere-logos/apex.svg', stylized: true, themeInk: true },
  { id: 'cs2', labelEn: 'CS2', labelAr: 'CS2', src: '/atmosphere-logos/cs2.svg', stylized: true, themeInk: true },
];

export const ATMOSPHERE_LOGO_IDS = ATMOSPHERE_LOGO_CATALOG.map((e) => e.id);

export function atmosphereLogoById(
  id: string,
  custom: AtmosphereCustomLogo[] = [],
): AtmosphereLogoEntry | undefined {
  const customHit = custom.find((c) => c.id === id);
  if (customHit) {
    return {
      id: customHit.id,
      src: customHit.src,
      labelEn: customHit.labelEn,
      labelAr: customHit.labelAr,
    };
  }
  return ATMOSPHERE_LOGO_CATALOG.find((e) => e.id === id);
}

export function resolveAtmosphereLogos(
  ids: string[],
  custom: AtmosphereCustomLogo[] = [],
): AtmosphereLogoEntry[] {
  const out: AtmosphereLogoEntry[] = [];
  for (const id of ids) {
    const e = atmosphereLogoById(id, custom);
    if (e) out.push(e);
  }
  return out;
}
