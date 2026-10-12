import { Film, Bookmark, LayoutList, PanelBottom, Orbit, Clapperboard, type LucideIcon } from 'lucide-react';
import { type Product } from '../../../types';

export type BuilderProduct = Pick<
  Product,
  'id' | 'name' | 'name_ar' | 'thumbnail_url' | 'price' | 'status'
>;

export const HERO_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';

export const HERO_MAX_BYTES = 20 * 1024 * 1024;

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

export const BUILDER_NAV: {
  id: string;
  ar: string;
  en: string;
  Icon: LucideIcon;
  tone: string;
}[] = [
  {
    id: 'builder-presets',
    ar: 'مسبقة',
    en: 'Presets',
    Icon: Bookmark,
    tone: 'border-primary/35 text-primary',
  },
  {
    id: 'builder-hero',
    ar: 'البطل',
    en: 'Hero',
    Icon: Film,
    tone: 'border-info/40 text-info',
  },
  {
    id: 'builder-player',
    ar: 'المشغّل',
    en: 'Player',
    Icon: Clapperboard,
    tone: 'border-warning/40 text-warning',
  },
  {
    id: 'builder-atmosphere',
    ar: 'أجواء',
    en: 'Atmosphere',
    Icon: Orbit,
    tone: 'border-success/40 text-success',
  },
  {
    id: 'builder-sections',
    ar: 'أقسام',
    en: 'Sections',
    Icon: LayoutList,
    tone: 'border-base-content/30 text-base-content/80',
  },
  {
    id: 'builder-footer',
    ar: 'تذييل',
    en: 'Footer',
    Icon: PanelBottom,
    tone: 'border-accent/40 text-accent',
  },
];

export const SECTION_SHELL =
  'builder-section scroll-mt-28 rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5 space-y-4';

export const SECTION_TITLE =
  'text-lg font-semibold tracking-tight leading-tight text-balance flex items-center gap-2';

export const SECTION_DESC = 'text-sm text-base-content/65 mt-1 text-pretty max-w-prose leading-relaxed';

export type HeroEditorTab = 'panels' | 'look' | 'welcome';

export type AtmosphereEditorTab = 'pages' | 'layers' | 'tune';

export type SectionsEditorTab = 'order' | 'widgets' | 'site';
