import { supabase } from './supabase';
import {
  DEFAULT_PRIVACY_POLICY,
  DEFAULT_TERMS_POLICY,
} from './policyDocs';
import { DEFAULT_USER_CHANGELOG } from './changelogs';

export const SITE_SETTING_KEYS = [
  'site_name',
  'site_tagline',
  'site_tagline_ar',
  'site_tagline_en',
  'hero_eyebrow_ar',
  'hero_eyebrow_en',
  'hero_title_ar',
  'hero_title_en',
  'hero_subtitle_ar',
  'hero_subtitle_en',
  'hero_desc_ar',
  'hero_desc_en',
  'footer_description_ar',
  'footer_description_en',
  'social_twitter',
  'social_youtube',
  'social_telegram',
  'contact_email',
  'brand_primary',
  'brand_accent',
  'brand_palette',
  'default_skin',
  'ui_scale',
  'about_title_ar',
  'about_title_en',
  'about_intro_ar',
  'about_intro_en',
  'about_items',
  'home_sections',
  'store_sections',
  'hero_media',
  'hero_media_blur',
  'hero_media_softness',
  'hero_card_opacity',
  'hero_card_aura',
  'hero_bottom_fade',
  'hero_bottom_fade_animate',
  'hero_logo_placement',
  'hero_logo_url',
  'hero_enabled',
  'hero_backdrop_enabled',
  'home_ads_product_ids',
  'home_ads_aura',
  'home_ads_interval_sec',
  'home_ads_size',
  'home_ads_blade_enabled',
  'home_ads_blade_text_en',
  'home_ads_blade_text_ar',
  'home_ads_blade_size',
  'home_ads_blade_color',
  'home_ads_blade_opacity',
  'home_ads_glare_hover',
  /**
   * Storefront merch FX motion vs prefers-reduced-motion:
   * auto (default) = honor OS; always = keep motion (Cursor/Windows escape hatch); off = always calm.
   */
  'merch_motion_mode',
  'home_hover_cards_count',
  'home_hover_cards_mode',
  'home_hover_cards_product_ids',
  'home_featured_product_ids',
  'store_featured_product_ids',
  'store_featured_mirror_home',
  'store_category_tree_expand',
  'product_find_more_enabled',
  'product_find_more_mode',
  'product_find_more_slots',
  'product_find_more_interval_sec',
  'product_find_more_product_ids',
  'product_detail_fx_json',
  /** Global product-card hover-3d tune: { motion, speed, smooth } 1–10. */
  'product_hover_3d_json',
  'drawer_categories_enabled',
  'privacy_consent_banner',
  'account_deletion_grace_days',
  'privacy_policy_json',
  'terms_policy_json',
  'user_changelog_json',
  'footer_nav',
  'plyr_json',
  'product_types_json',
  'builder_presets',
  /** ISO timestamp — dashboard paid revenue / paid orders / products / recent orders count from this point. Empty = all time. Does not touch Databuddy traffic or pending. */
  'dashboard_stats_reset_at',
  /** When true (default), only product created_by may delete that product. */
  'product_author_lock',
  /** Max new products a seller may create per UTC day. 0 = unlimited. Default 3. */
  'seller_daily_product_limit',
  /** Which non-owner roles may use dual-account switch: { admin, moderator, seller }. */
  'multi_account_roles_json',
] as const;

export type SiteSettingKey = (typeof SITE_SETTING_KEYS)[number];
export type SiteSettingsMap = Record<SiteSettingKey, string>;

export const UI_SCALE_DEFAULT = 90;
export const UI_SCALE_VALUES = [75, 80, 85, 90, 95, 100, 105, 110] as const;

export function parseUiScale(raw: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return UI_SCALE_DEFAULT;
  const clamped = Math.min(110, Math.max(75, parsed));
  return Math.round(clamped / 5) * 5;
}

export interface AboutItem {
  icon: string;
  title_ar: string;
  title_en: string;
  desc_ar: string;
  desc_en: string;
}

export const DEFAULT_ABOUT_ITEMS: AboutItem[] = [
  { icon: 'Zap', title_ar: 'تسليم فوري', title_en: 'Instant Delivery', desc_ar: 'يصلك المنتج خلال ثوانٍ بعد إتمام الدفع.', desc_en: 'Get your products in seconds.' },
  { icon: 'Shield', title_ar: 'دفع آمن', title_en: 'Complete Security', desc_ar: 'معاملات محمية، وبياناتك وطلباتك في أمان.', desc_en: '100% secure transactions with best security protocols.' },
  { icon: 'Users', title_ar: 'دعم متواصل', title_en: 'Continuous Support', desc_ar: 'فريق الدعم جاهز لمساعدتك عندما تحتاج.', desc_en: 'Support team available 24/7.' },
  { icon: 'Globe', title_ar: 'خدمة واسعة', title_en: 'Available Worldwide', desc_ar: 'نخدم زبائننا من مختلف أنحاء العالم.', desc_en: 'Serving users everywhere around the world.' },
];

/* ---- Page sections (owner-configurable order + visibility) ---- */

export interface PageSection {
  id: string;
  enabled: boolean;
}

export const HOME_SECTION_IDS = ['categories', 'ads', 'featured', 'products', 'hover_cards', 'cta'] as const;

/** Dynamic homepage grid: products with exact category_id (not descendants). */
export const CATEGORY_PRODUCTS_PREFIX = 'category_products:';
export const HOME_CATEGORY_SECTIONS_MAX = 12;
/** Same cap for Explore Store category blocks under the full catalog. */
export const STORE_CATEGORY_SECTIONS_MAX = HOME_CATEGORY_SECTIONS_MAX;
export const FEATURED_PRODUCTS_MAX = 12;

export function categoryProductsSectionId(categoryId: string): string {
  return `${CATEGORY_PRODUCTS_PREFIX}${categoryId}`;
}

export function parseCategoryProductsSectionId(sectionId: string): string | null {
  if (!sectionId.startsWith(CATEGORY_PRODUCTS_PREFIX)) return null;
  const id = sectionId.slice(CATEGORY_PRODUCTS_PREFIX.length).trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null;
}

export function isCategoryProductsSection(sectionId: string): boolean {
  return parseCategoryProductsSectionId(sectionId) !== null;
}

export const STORE_SECTION_IDS = ['search', 'sort'] as const;

export const DEFAULT_HOME_SECTIONS: PageSection[] = HOME_SECTION_IDS.map((id) => ({
  id,
  // Ads / hover cards off until configured in Website Builder.
  enabled: id !== 'ads' && id !== 'hover_cards',
}));
export const DEFAULT_STORE_SECTIONS: PageSection[] = STORE_SECTION_IDS.map((id) => ({ id, enabled: true }));

export const HOME_ADS_MAX = 8;
export const HOME_ADS_INTERVAL_MIN = 2;
export const HOME_ADS_INTERVAL_MAX = 15;
export const HOME_ADS_INTERVAL_DEFAULT = 6;
export const HOME_ADS_SIZES = ['sm', 'md', 'lg', 'xl'] as const;
export type HomeAdsSize = (typeof HOME_ADS_SIZES)[number];
export const HOME_ADS_SIZE_DEFAULT: HomeAdsSize = 'md';
export const HOME_HOVER_CARDS_MAX = 6;

/** JSON string-array of ids, capped. Shared by featured/ads/find-more pickers. */
export function parseStringIdList(raw: string, max: number): string[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim())
      .slice(0, max);
  } catch {
    return [];
  }
}

/** Ordered product ids for the homepage ad banner carousel. */
export function parseHomeAdsProductIds(raw: string): string[] {
  return parseStringIdList(raw, HOME_ADS_MAX);
}

/** DaisyUI aura for the homepage ad banner. Default dual. */
export function parseHomeAdsAura(raw: string): string {
  return parseHeroCardAura(raw.trim() ? raw : 'dual');
}

/** Seconds between ad banner slides. */
export function parseHomeAdsIntervalSec(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return HOME_ADS_INTERVAL_DEFAULT;
  return Math.min(HOME_ADS_INTERVAL_MAX, Math.max(HOME_ADS_INTERVAL_MIN, Math.round(n)));
}

/** Banner height preset — short → tall. */
export function parseHomeAdsSize(raw: string): HomeAdsSize {
  const v = raw.trim().toLowerCase();
  return (HOME_ADS_SIZES as readonly string[]).includes(v)
    ? (v as HomeAdsSize)
    : HOME_ADS_SIZE_DEFAULT;
}

/** Tailwind stage classes for `home_ads_size`. */
export function homeAdsSizeClass(size: HomeAdsSize): string {
  switch (size) {
    case 'sm':
      return 'aspect-[3/1] min-h-32 sm:min-h-40 md:min-h-48 lg:min-h-56';
    case 'lg':
      return 'aspect-[16/9] min-h-52 sm:min-h-64 md:min-h-80 lg:min-h-96';
    case 'xl':
      return 'aspect-[16/9] min-h-64 sm:min-h-80 md:min-h-96 lg:min-h-[28rem]';
    case 'md':
    default:
      return 'aspect-[21/9] min-h-44 sm:min-h-52 md:min-h-72 lg:min-h-80';
  }
}

/** Suggested upload pixels (desktop stage width ≈ 1920; xl sharper). Matches aspect in homeAdsSizeClass. */
export type HomeAdsSizeGuide = { aspect: string; width: number; height: number };
export const HOME_ADS_SIZE_GUIDES: Record<HomeAdsSize, HomeAdsSizeGuide> = {
  sm: { aspect: '3:1', width: 1920, height: 640 },
  md: { aspect: '21:9', width: 1920, height: 823 },
  lg: { aspect: '16:9', width: 1920, height: 1080 },
  xl: { aspect: '16:9', width: 2560, height: 1440 },
};

export const HOME_ADS_BLADE_TEXT_EN_DEFAULT = 'Special offer for a limited time!';
export const HOME_ADS_BLADE_TEXT_AR_DEFAULT = 'عرض خاص لفترة محدودة!';
export const HOME_ADS_BLADE_TEXT_MAX = 120;

export const HOME_ADS_BLADE_SIZES = ['sm', 'md', 'lg'] as const;
export type HomeAdsBladeSize = (typeof HOME_ADS_BLADE_SIZES)[number];
export const HOME_ADS_BLADE_SIZE_DEFAULT: HomeAdsBladeSize = 'md';
export const HOME_ADS_BLADE_COLOR_DEFAULT = '#0a0a0a';
export const HOME_ADS_BLADE_OPACITY_DEFAULT = 88;

/** Thin scrolling edge strips on the ad banner. Off by default. */
export function parseHomeAdsBladeEnabled(raw: string): boolean {
  return raw.trim() === 'true';
}

/** React Bits–style glare sweep on ad banner hover. Off by default. */
export function parseHomeAdsGlareHover(raw: string): boolean {
  return raw.trim() === 'true';
}

export const MERCH_MOTION_MODES = ['auto', 'always', 'off'] as const;
export type MerchMotionMode = (typeof MERCH_MOTION_MODES)[number];
export const MERCH_MOTION_MODE_DEFAULT: MerchMotionMode = 'auto';

/** auto = honor OS reduced-motion; always = keep merch FX; off = calm merch FX. */
export function parseMerchMotionMode(raw: string): MerchMotionMode {
  const v = raw.trim().toLowerCase();
  return (MERCH_MOTION_MODES as readonly string[]).includes(v)
    ? (v as MerchMotionMode)
    : MERCH_MOTION_MODE_DEFAULT;
}

/** True when merch FX should freeze (static aura / no canvas rAF / no tilt). */
export function merchMotionShouldCalm(mode: MerchMotionMode, prefersReduced: boolean): boolean {
  if (mode === 'off') return true;
  if (mode === 'always') return false;
  return prefersReduced;
}

export function parseHomeAdsBladeText(raw: string, fallback: string): string {
  const v = raw.replace(/\s+/g, ' ').trim();
  if (!v) return fallback;
  return v.slice(0, HOME_ADS_BLADE_TEXT_MAX);
}

export function parseHomeAdsBladeSize(raw: string): HomeAdsBladeSize {
  const v = raw.trim().toLowerCase();
  return (HOME_ADS_BLADE_SIZES as readonly string[]).includes(v)
    ? (v as HomeAdsBladeSize)
    : HOME_ADS_BLADE_SIZE_DEFAULT;
}

/** Hex `#rgb` / `#rrggbb` only; empty → default. */
export function parseHomeAdsBladeColor(raw: string): string {
  const v = raw.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return v.length === 4
    ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase()
    : v.toLowerCase();
  return HOME_ADS_BLADE_COLOR_DEFAULT;
}

/** 20–100 (%). */
export function parseHomeAdsBladeOpacity(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return HOME_ADS_BLADE_OPACITY_DEFAULT;
  return Math.min(100, Math.max(20, Math.round(n)));
}

export function homeAdsBladeSizePx(size: HomeAdsBladeSize): number {
  switch (size) {
    case 'sm':
      return 18;
    case 'lg':
      return 32;
    case 'md':
    default:
      return 22;
  }
}

export function parseHomeHoverCardsCount(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 3;
  return Math.min(HOME_HOVER_CARDS_MAX, Math.max(1, Math.round(n)));
}

export type HoverCardsMode = 'auto' | 'manual';

export function parseHomeHoverCardsMode(raw: string): HoverCardsMode {
  return raw.trim() === 'manual' ? 'manual' : 'auto';
}

export function parseHomeHoverCardsProductIds(raw: string): string[] {
  return parseStringIdList(raw, HOME_HOVER_CARDS_MAX);
}

/** Ordered product ids for Home / Explore featured rails. */
export function parseFeaturedProductIds(raw: string): string[] {
  return parseStringIdList(raw, FEATURED_PRODUCTS_MAX);
}

/** When true, Explore featured uses Home’s featured ID list. */
export function parseStoreFeaturedMirrorHome(raw: string): boolean {
  return raw.trim() === 'true';
}

/** Product detail “Find More Products” rotator (max 8 in pool). */
export const PRODUCT_FIND_MORE_MAX = 8;
export const PRODUCT_FIND_MORE_SLOTS_DEFAULT = 4;
export const PRODUCT_FIND_MORE_INTERVAL_MIN = 2;
export const PRODUCT_FIND_MORE_INTERVAL_MAX = 15;
export const PRODUCT_FIND_MORE_INTERVAL_DEFAULT = 3;

export function parseProductFindMoreEnabled(raw: string): boolean {
  return raw.trim() !== 'false';
}

export type ProductFindMoreMode = 'auto' | 'manual';

export function parseProductFindMoreMode(raw: string): ProductFindMoreMode {
  return raw.trim() === 'manual' ? 'manual' : 'auto';
}

export function parseProductFindMoreSlots(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return PRODUCT_FIND_MORE_SLOTS_DEFAULT;
  return Math.min(PRODUCT_FIND_MORE_MAX, Math.max(1, Math.round(n)));
}

export function parseProductFindMoreIntervalSec(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return PRODUCT_FIND_MORE_INTERVAL_DEFAULT;
  return Math.min(
    PRODUCT_FIND_MORE_INTERVAL_MAX,
    Math.max(PRODUCT_FIND_MORE_INTERVAL_MIN, Math.round(n))
  );
}

export function parseProductFindMoreProductIds(raw: string): string[] {
  return parseStringIdList(raw, PRODUCT_FIND_MORE_MAX);
}

/** Show category links in the mobile drawer menu. Default on. */
export function parseDrawerCategoriesEnabled(raw: string): boolean {
  return raw.trim() !== 'false';
}

/** Explore Store category chip expand controls. Default off. */
export function parseStoreCategoryTreeExpand(raw: string): boolean {
  return raw.trim() === 'true';
}

/** Show privacy / analytics consent banner. Default on. */
export function parsePrivacyConsentBanner(raw: string): boolean {
  return raw.trim() !== 'false';
}

/* ---- Website Builder presets (max 5) ---- */

/** site_settings keys captured by a builder preset (not builder_presets itself). */
export const BUILDER_PRESET_KEYS = [
  'home_sections',
  'store_sections',
  'hero_media',
  'hero_media_blur',
  'hero_media_softness',
  'hero_card_opacity',
  'hero_card_aura',
  'hero_bottom_fade',
  'hero_bottom_fade_animate',
  'hero_logo_placement',
  'hero_logo_url',
  'hero_enabled',
  'hero_backdrop_enabled',
  'home_ads_product_ids',
  'home_ads_aura',
  'home_ads_interval_sec',
  'home_ads_size',
  'home_ads_blade_enabled',
  'home_ads_blade_text_en',
  'home_ads_blade_text_ar',
  'home_ads_blade_size',
  'home_ads_blade_color',
  'home_ads_blade_opacity',
  'home_ads_glare_hover',
  'merch_motion_mode',
  'home_hover_cards_count',
  'home_hover_cards_mode',
  'home_hover_cards_product_ids',
  'home_featured_product_ids',
  'store_featured_product_ids',
  'store_featured_mirror_home',
  'store_category_tree_expand',
  'product_find_more_enabled',
  'product_find_more_mode',
  'product_find_more_slots',
  'product_find_more_interval_sec',
  'product_find_more_product_ids',
  'product_detail_fx_json',
  'product_hover_3d_json',
  'drawer_categories_enabled',
  'privacy_consent_banner',
  'footer_nav',
  'plyr_json',
] as const;

export type BuilderPresetKey = (typeof BUILDER_PRESET_KEYS)[number];
export const BUILDER_PRESETS_MAX = 5;

export interface BuilderPreset {
  id: string;
  name: string;
  /** When true, preset cannot be deleted until unlocked. */
  locked: boolean;
  updated_at: string;
  snapshot: Partial<Record<BuilderPresetKey, string>>;
}

export function parseBuilderPresets(raw: string): BuilderPreset[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: BuilderPreset[] = [];
    for (const item of parsed.slice(0, BUILDER_PRESETS_MAX)) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `preset-${out.length + 1}`;
      const name = typeof o.name === 'string' && o.name.trim() ? o.name.trim() : `Preset ${out.length + 1}`;
      const snapRaw = o.snapshot && typeof o.snapshot === 'object' ? (o.snapshot as Record<string, unknown>) : {};
      const snapshot: Partial<Record<BuilderPresetKey, string>> = {};
      for (const key of BUILDER_PRESET_KEYS) {
        const v = snapRaw[key];
        if (typeof v === 'string') snapshot[key] = v;
      }
      out.push({
        id,
        name,
        locked: o.locked === true,
        updated_at: typeof o.updated_at === 'string' ? o.updated_at : new Date().toISOString(),
        snapshot,
      });
    }
    return out;
  } catch {
    return [];
  }
}

/* ---- Product page Plyr (Website Builder) ---- */

export const PLYR_CONTROL_OPTIONS = [
  'play',
  'progress',
  'current-time',
  'mute',
  'volume',
  'fullscreen',
] as const;

export type PlyrControlId = (typeof PLYR_CONTROL_OPTIONS)[number];

export interface PlyrSiteConfig {
  enabled: boolean;
  accent: string;
  controls: PlyrControlId[];
  seekTooltips: boolean;
}

export const DEFAULT_PLYR_CONFIG: PlyrSiteConfig = {
  enabled: true,
  accent: '#2dd4bf',
  controls: [...PLYR_CONTROL_OPTIONS],
  seekTooltips: true,
};

export function parsePlyrConfig(raw: string): PlyrSiteConfig {
  if (!raw.trim()) return { ...DEFAULT_PLYR_CONFIG, controls: [...DEFAULT_PLYR_CONFIG.controls] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return { ...DEFAULT_PLYR_CONFIG, controls: [...DEFAULT_PLYR_CONFIG.controls] };
    }
    const o = parsed as Record<string, unknown>;
    const controlsRaw = Array.isArray(o.controls) ? o.controls : DEFAULT_PLYR_CONFIG.controls;
    const controls = controlsRaw
      .filter((c): c is PlyrControlId =>
        typeof c === 'string' && (PLYR_CONTROL_OPTIONS as readonly string[]).includes(c)
      );
    return {
      enabled: o.enabled !== false,
      accent:
        typeof o.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(o.accent.trim())
          ? o.accent.trim()
          : DEFAULT_PLYR_CONFIG.accent,
      controls: controls.length > 0 ? controls : [...DEFAULT_PLYR_CONFIG.controls],
      seekTooltips: o.seekTooltips !== false,
    };
  } catch {
    return { ...DEFAULT_PLYR_CONFIG, controls: [...DEFAULT_PLYR_CONFIG.controls] };
  }
}

/* ---- Site atmosphere (grid / particles / game icons) ---- */

export type AtmospherePageKey =
  | 'home'
  | 'store'
  | 'subscriptions'
  | 'giftCards'
  | 'product'
  | 'seller'
  | 'cart'
  | 'checkout'
  | 'wishlist'
  | 'about'
  | 'other'
  /** Chrome — welcome card hosts Patterns / Particles / Logo behind its text. */
  | 'heroWelcome'
  /** Chrome — see-through footer when atmosphere is on. */
  | 'footer'
  /** Chrome — see-through nav drawer menu when atmosphere is on. */
  | 'drawer';

/** Route keys only (not footer/drawer/hero chrome flags). */
export type AtmosphereRouteKey = Exclude<
  AtmospherePageKey,
  'footer' | 'drawer' | 'heroWelcome'
>;

export const ATMOSPHERE_ROUTE_KEYS: readonly AtmosphereRouteKey[] = [
  'home',
  'store',
  'subscriptions',
  'giftCards',
  'product',
  'seller',
  'cart',
  'checkout',
  'wishlist',
  'about',
  'other',
] as const;

/** Which FX layers show on a storefront route (ANDed with global grid/particles/logo). */
export type AtmospherePageLayerFlags = {
  grid: boolean;
  particles: boolean;
  logo: boolean;
};

export type AtmospherePageLayers = Record<AtmosphereRouteKey, AtmospherePageLayerFlags>;

export type AtmospherePages = Record<AtmospherePageKey, boolean>;

export type AtmospherePatternId = 'lines' | 'dots' | 'diagonal' | 'cross' | 'plus';
export type AtmospherePatternLayer = 'behind' | 'above';

export const ATMOSPHERE_PATTERN_IDS: readonly AtmospherePatternId[] = [
  'lines',
  'dots',
  'diagonal',
  'cross',
  'plus',
] as const;

export type AtmosphereCustomLogo = {
  id: string;
  src: string;
  labelEn: string;
  labelAr: string;
};

export interface ProductDetailFxConfig {
  enabled: boolean;
  grid: boolean;
  particles: boolean;
  logo: boolean;
  /** Pattern layer strength 0–100. */
  gridOpacity: number;
  /** Floating marks strength 0–100. */
  particleOpacity: number;
  /** Watermark logo strength 0–100. */
  logoOpacity: number;
  /** Particle count 8–64. */
  particleCount: number;
  /** Logo instance count 1–12. */
  logoCount: number;
  /** Pattern density 25–250 (100 = default; higher = more / tighter cells). */
  gridSize: number;
  /** Particle mark size scale 25–250 (100 = default). */
  particleSize: number;
  /** Game icon size scale 25–250 (100 = default). */
  logoSize: number;
  /** Particle drift speed 25–250 (100 = default; higher = faster). */
  particleSpeed: number;
  /** Logo drift speed 25–250 (100 = default; higher = faster). */
  logoSpeed: number;
  /** Active background patterns (with grid toggle). */
  patterns: AtmospherePatternId[];
  /** Patterns under content (`behind`) or over UI (`above`). */
  patternLayer: AtmospherePatternLayer;
  /** Which storefront surfaces show atmosphere. */
  pages: AtmospherePages;
  /** Per-route layer picks (patterns / particles / logo). */
  pageLayers: AtmospherePageLayers;
  /** Welcome-card layers (AND with global masters; independent of Home page FX). */
  chromeLayers: { heroWelcome: AtmospherePageLayerFlags };
  /** Selected logo ids (catalog + custom). */
  logoIds: string[];
  /** Uploaded / pasted real logo assets. */
  customLogos: AtmosphereCustomLogo[];
}

export const DEFAULT_ATMOSPHERE_PAGES: AtmospherePages = {
  home: true,
  store: true,
  subscriptions: false,
  giftCards: false,
  product: true,
  seller: false,
  cart: false,
  checkout: false,
  wishlist: false,
  about: false,
  other: false,
  heroWelcome: false,
  footer: false,
  drawer: false,
};

export const DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS: AtmospherePageLayerFlags = {
  grid: true,
  particles: true,
  logo: true,
};

export function defaultAtmospherePageLayers(): AtmospherePageLayers {
  return Object.fromEntries(
    ATMOSPHERE_ROUTE_KEYS.map((k) => [k, { ...DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS }]),
  ) as AtmospherePageLayers;
}

export const DEFAULT_ATMOSPHERE_LOGO_IDS = ['rust', 'fortnite', 'gta5', 'cod'] as const;

export const DEFAULT_PRODUCT_DETAIL_FX: ProductDetailFxConfig = {
  enabled: true,
  grid: true,
  particles: true,
  logo: true,
  gridOpacity: 16,
  particleOpacity: 32,
  logoOpacity: 14,
  particleCount: 28,
  logoCount: 4,
  gridSize: 100,
  particleSize: 100,
  logoSize: 100,
  particleSpeed: 100,
  logoSpeed: 100,
  patterns: ['lines'],
  patternLayer: 'above',
  pages: { ...DEFAULT_ATMOSPHERE_PAGES },
  pageLayers: defaultAtmospherePageLayers(),
  chromeLayers: { heroWelcome: { ...DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS } },
  logoIds: [...DEFAULT_ATMOSPHERE_LOGO_IDS],
  customLogos: [],
};

function clampFxPct(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function clampFxCount(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(64, Math.max(8, Math.round(v)));
}

/** Size/speed scale percent 25–250 (100 = default). */
function clampFxSize(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(250, Math.max(25, Math.round(v)));
}

function clampLogoCount(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.min(12, Math.max(1, Math.round(v)));
}

export function clampAtmospherePatterns(raw: unknown): AtmospherePatternId[] {
  const allow = new Set<string>(ATMOSPHERE_PATTERN_IDS);
  const list = Array.isArray(raw)
    ? raw.filter((id): id is AtmospherePatternId => typeof id === 'string' && allow.has(id))
    : [];
  return list.length > 0 ? [...new Set(list)] : [...DEFAULT_PRODUCT_DETAIL_FX.patterns];
}

export function clampAtmospherePatternLayer(raw: unknown): AtmospherePatternLayer {
  return raw === 'behind' ? 'behind' : 'above';
}

function parseAtmospherePages(raw: unknown): AtmospherePages {
  const out = { ...DEFAULT_ATMOSPHERE_PAGES };
  if (!raw || typeof raw !== 'object') return out;
  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(out) as AtmospherePageKey[]) {
    if (key in o) out[key] = o[key] !== false && o[key] !== 'false' && o[key] !== 0;
  }
  return out;
}

function parseAtmospherePageLayers(raw: unknown): AtmospherePageLayers {
  const out = defaultAtmospherePageLayers();
  if (!raw || typeof raw !== 'object') return out;
  const o = raw as Record<string, unknown>;
  for (const key of ATMOSPHERE_ROUTE_KEYS) {
    const v = o[key];
    if (!v || typeof v !== 'object') continue;
    const L = v as Record<string, unknown>;
    out[key] = {
      grid: L.grid !== false && L.grid !== 'false' && L.grid !== 0,
      particles: L.particles !== false && L.particles !== 'false' && L.particles !== 0,
      logo: L.logo !== false && L.logo !== 'false' && L.logo !== 0,
    };
  }
  return out;
}

/** Effective layers for a route: page picks AND global masters. */
export function resolveAtmosphereLayers(
  config: Pick<ProductDetailFxConfig, 'grid' | 'particles' | 'logo' | 'pageLayers'>,
  pageKey: AtmosphereRouteKey,
): AtmospherePageLayerFlags {
  const local = config.pageLayers[pageKey] ?? DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS;
  return {
    grid: config.grid && local.grid,
    particles: config.particles && local.particles,
    logo: config.logo && local.logo,
  };
}

/** Welcome-card layers: chrome picks AND global masters (no Home page required). */
export function resolveHeroWelcomeLayers(
  config: Pick<ProductDetailFxConfig, 'grid' | 'particles' | 'logo' | 'chromeLayers'>,
): AtmospherePageLayerFlags {
  const local =
    config.chromeLayers?.heroWelcome ?? DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS;
  return {
    grid: config.grid && local.grid,
    particles: config.particles && local.particles,
    logo: config.logo && local.logo,
  };
}

function parseAtmosphereChromeLayers(raw: unknown): ProductDetailFxConfig['chromeLayers'] {
  const out = { heroWelcome: { ...DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS } };
  if (!raw || typeof raw !== 'object') return out;
  const hw = (raw as Record<string, unknown>).heroWelcome;
  if (!hw || typeof hw !== 'object') return out;
  const L = hw as Record<string, unknown>;
  out.heroWelcome = {
    grid: L.grid !== false && L.grid !== 'false' && L.grid !== 0,
    particles: L.particles !== false && L.particles !== 'false' && L.particles !== 0,
    logo: L.logo !== false && L.logo !== 'false' && L.logo !== 0,
  };
  return out;
}

/** Keep only known catalog + custom ids; empty input → defaults. */
export function clampAtmosphereLogoIds(
  raw: unknown,
  allowed: readonly string[],
  fallback: string[] = [...DEFAULT_ATMOSPHERE_LOGO_IDS],
): string[] {
  const allow = new Set(allowed);
  const list = Array.isArray(raw)
    ? raw.filter((id): id is string => typeof id === 'string' && allow.has(id))
    : [];
  return list.length > 0 ? [...new Set(list)] : [...fallback];
}

function isAtmosphereLogoSrc(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true;
  try {
    const u = new URL(src);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseAtmosphereCustomLogos(raw: unknown): AtmosphereCustomLogo[] {
  if (!Array.isArray(raw)) return [];
  const out: AtmosphereCustomLogo[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === 'string' ? o.id.trim() : '';
    const src = typeof o.src === 'string' ? o.src.trim() : '';
    if (!id || !src || seen.has(id) || !isAtmosphereLogoSrc(src)) continue;
    seen.add(id);
    const labelEn =
      typeof o.labelEn === 'string' && o.labelEn.trim() ? o.labelEn.trim() : id;
    const labelAr =
      typeof o.labelAr === 'string' && o.labelAr.trim() ? o.labelAr.trim() : labelEn;
    out.push({ id, src, labelEn, labelAr });
    if (out.length >= 24) break;
  }
  return out;
}

export function parseProductDetailFx(
  raw: string,
  allowedLogoIds?: readonly string[],
): ProductDetailFxConfig {
  const catalogAllowed = allowedLogoIds ?? DEFAULT_ATMOSPHERE_LOGO_IDS;
  if (!raw.trim()) {
    return {
      ...DEFAULT_PRODUCT_DETAIL_FX,
      pages: { ...DEFAULT_ATMOSPHERE_PAGES },
      pageLayers: defaultAtmospherePageLayers(),
      chromeLayers: { heroWelcome: { ...DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS } },
      logoIds: [...DEFAULT_ATMOSPHERE_LOGO_IDS],
      customLogos: [],
    };
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return {
        ...DEFAULT_PRODUCT_DETAIL_FX,
        pages: { ...DEFAULT_ATMOSPHERE_PAGES },
        pageLayers: defaultAtmospherePageLayers(),
        chromeLayers: { heroWelcome: { ...DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS } },
        logoIds: [...DEFAULT_ATMOSPHERE_LOGO_IDS],
        customLogos: [],
      };
    }
    const o = parsed as Record<string, unknown>;
    const customLogos = parseAtmosphereCustomLogos(o.customLogos);
    const allowed = [
      ...catalogAllowed,
      ...customLogos.map((c) => c.id),
    ];
    const customFallback =
      customLogos.length > 0 ? customLogos.map((c) => c.id) : [...DEFAULT_ATMOSPHERE_LOGO_IDS];
    return {
      enabled: o.enabled !== false,
      grid: o.grid !== false,
      particles: o.particles !== false,
      logo: o.logo !== false,
      gridOpacity: clampFxPct(o.gridOpacity, DEFAULT_PRODUCT_DETAIL_FX.gridOpacity),
      particleOpacity: clampFxPct(o.particleOpacity, DEFAULT_PRODUCT_DETAIL_FX.particleOpacity),
      logoOpacity: clampFxPct(o.logoOpacity, DEFAULT_PRODUCT_DETAIL_FX.logoOpacity),
      particleCount: clampFxCount(o.particleCount, DEFAULT_PRODUCT_DETAIL_FX.particleCount),
      logoCount: clampLogoCount(o.logoCount, DEFAULT_PRODUCT_DETAIL_FX.logoCount),
      gridSize: clampFxSize(o.gridSize, DEFAULT_PRODUCT_DETAIL_FX.gridSize),
      particleSize: clampFxSize(o.particleSize, DEFAULT_PRODUCT_DETAIL_FX.particleSize),
      logoSize: clampFxSize(o.logoSize, DEFAULT_PRODUCT_DETAIL_FX.logoSize),
      particleSpeed: clampFxSize(o.particleSpeed, DEFAULT_PRODUCT_DETAIL_FX.particleSpeed),
      logoSpeed: clampFxSize(o.logoSpeed, DEFAULT_PRODUCT_DETAIL_FX.logoSpeed),
      patterns: clampAtmospherePatterns(o.patterns),
      patternLayer: clampAtmospherePatternLayer(o.patternLayer),
      pages: parseAtmospherePages(o.pages),
      pageLayers: parseAtmospherePageLayers(o.pageLayers),
      chromeLayers: parseAtmosphereChromeLayers(o.chromeLayers),
      customLogos,
      logoIds: clampAtmosphereLogoIds(o.logoIds, allowed, customFallback),
    };
  } catch {
    return {
      ...DEFAULT_PRODUCT_DETAIL_FX,
      pages: { ...DEFAULT_ATMOSPHERE_PAGES },
      pageLayers: defaultAtmospherePageLayers(),
      chromeLayers: { heroWelcome: { ...DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS } },
      logoIds: [...DEFAULT_ATMOSPHERE_LOGO_IDS],
      customLogos: [],
    };
  }
}

/* ---- Hero backdrop media (Website Builder) ---- */

export interface HeroMediaItem {
  id: string;
  url: string;
  kind: 'image' | 'video';
  /** Focal point 0–100 (object-position X). Default 50. */
  pos_x?: number;
  /** Focal point 0–100 (object-position Y). Default 50. */
  pos_y?: number;
  /** Zoom percent 100–250. Default 145 (matches prior fixed scale). */
  zoom?: number;
}

export const HERO_MEDIA_MAX = 5;
export const HERO_ZOOM_DEFAULT = 145;
export const HERO_ZOOM_MIN = 100;
export const HERO_ZOOM_MAX = 250;

export function clampHeroPos(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return 50;
  return Math.min(100, Math.max(0, Math.round(v)));
}

export function clampHeroZoom(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(v)) return HERO_ZOOM_DEFAULT;
  return Math.min(HERO_ZOOM_MAX, Math.max(HERO_ZOOM_MIN, Math.round(v)));
}

/**
 * Pan + zoom crop that always moves on BOTH axes (object-position alone often
 * only affects the overflow axis of object-cover on wide panels).
 */
export function heroMediaPanStyle(
  item: Pick<HeroMediaItem, 'pos_x' | 'pos_y' | 'zoom'>
): { objectFit: 'cover'; transform: string; transformOrigin: string } {
  const x = clampHeroPos(item.pos_x);
  const y = clampHeroPos(item.pos_y);
  const scale = clampHeroZoom(item.zoom) / 100;
  const max = ((scale - 1) / 2) * 100;
  const tx = scale <= 1 ? 0 : ((50 - x) / 50) * max;
  const ty = scale <= 1 ? 0 : ((50 - y) / 50) * max;
  return {
    objectFit: 'cover',
    transform: `scale(${scale}) translate(${tx.toFixed(2)}%, ${ty.toFixed(2)}%)`,
    transformOrigin: 'center center',
  };
}

export function parseHeroMedia(raw: string): HeroMediaItem[] {
  if (!raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => {
        if (!item || typeof item !== 'object') return false;
        const row = item as Record<string, unknown>;
        return typeof row.url === 'string' && row.url.trim().length > 0;
      })
      .slice(0, HERO_MEDIA_MAX)
      .map((item, i) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `m-${i}`,
        url: String(item.url).trim(),
        kind: item.kind === 'video' ? ('video' as const) : ('image' as const),
        pos_x: clampHeroPos(item.pos_x),
        pos_y: clampHeroPos(item.pos_y),
        zoom: clampHeroZoom(item.zoom),
      }));
  } catch {
    return [];
  }
}

export function parseHeroMediaBlur(raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** 0 = hard edges, 100 = max feather. Default 18. */
export function parseHeroMediaSoftness(raw: string): number {
  if (!raw.trim()) return 18;
  // Legacy boolean from older builds
  if (raw === 'false' || raw === '0') return 0;
  if (raw === 'true') return 18;
  const n = Number(raw);
  if (Number.isNaN(n)) return 18;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Keep hero images decoded in memory across SPA navigations. */
const heroImageWarm = new Map<string, HTMLImageElement>();

export function preloadHeroMedia(items: HeroMediaItem[]): void {
  if (typeof window === 'undefined') return;
  for (const item of items) {
    const url = item.url?.trim();
    if (!url || item.kind === 'video') continue;
    if (heroImageWarm.has(url)) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    heroImageWarm.set(url, img);
  }
}

/** Hero welcome card opacity 0–100. Default 100. */
export function parseHeroCardOpacity(raw: string): number {
  if (!raw.trim()) return 100;
  const n = Number(raw);
  if (Number.isNaN(n)) return 100;
  return Math.min(100, Math.max(0, Math.round(n)));
}

const HERO_AURA_IDS = new Set([
  'none',
  'default',
  'dual',
  'rainbow',
  'holo',
  'gold',
  'silver',
  'glow',
]);

/** DaisyUI aura id for the hero welcome card. Default dual. */
export function parseHeroCardAura(raw: string): string {
  const id = raw.trim() || 'dual';
  return HERO_AURA_IDS.has(id) ? id : 'dual';
}

export function parseHeroBottomFade(raw: string): boolean {
  if (!raw.trim()) return true;
  return raw !== 'false' && raw !== '0';
}

export function parseHeroBottomFadeAnimate(raw: string): boolean {
  if (!raw.trim()) return false;
  return raw === 'true' || raw === '1';
}

export type HeroLogoPlacement = 'off' | 'above' | 'behind';

export function parseHeroLogoPlacement(raw: string): HeroLogoPlacement {
  const v = raw.trim();
  if (v === 'above' || v === 'behind') return v;
  return 'off';
}

export function parseHeroLogoUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return u;
  } catch {
    /* ignore */
  }
  return '';
}

/** Show the home welcome card (backdrop stays). Default on. */
export function parseHeroEnabled(raw: string): boolean {
  if (!raw.trim()) return true;
  return raw !== 'false' && raw !== '0';
}

/** Only product author may delete. Default on when unset. */
export function parseProductAuthorLock(raw: string): boolean {
  if (!raw.trim()) return true;
  return raw !== 'false' && raw !== '0' && raw !== 'off' && raw !== 'no';
}

/** Seller create cap per UTC day. 0 = unlimited. Clamped 0–100; default 3. */
export function parseSellerDailyProductLimit(raw: string | null | undefined): number {
  const n = Number.parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n)) return 3;
  return Math.max(0, Math.min(100, n));
}

/** Owner-gated dual-account switch for admin / moderator / support / seller. Default all off. */
export type MultiAccountRoleFlags = {
  admin: boolean;
  moderator: boolean;
  support: boolean;
  seller: boolean;
};

export const DEFAULT_MULTI_ACCOUNT_ROLES: MultiAccountRoleFlags = {
  admin: false,
  moderator: false,
  support: false,
  seller: false,
};

export function parseMultiAccountRoles(raw: string | null | undefined): MultiAccountRoleFlags {
  if (!raw?.trim()) return { ...DEFAULT_MULTI_ACCOUNT_ROLES };
  try {
    const o = JSON.parse(raw) as Partial<MultiAccountRoleFlags>;
    return {
      admin: o.admin === true,
      moderator: o.moderator === true,
      support: o.support === true,
      seller: o.seller === true,
    };
  } catch {
    return { ...DEFAULT_MULTI_ACCOUNT_ROLES };
  }
}

/** Start of current UTC day as ISO string (for created_at filters). */
export function utcDayStartIso(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

/** Show hero media/gradient backdrop. Default on. */
export function parseHeroBackdropEnabled(raw: string): boolean {
  if (!raw.trim()) return true;
  return raw !== 'false' && raw !== '0';
}

export interface FooterNavLink {
  label_ar: string;
  label_en: string;
  href: string;
}

export interface FooterNavColumn {
  id: string;
  enabled: boolean;
  title_ar: string;
  title_en: string;
  links: FooterNavLink[];
}

export const FOOTER_NAV_COLUMNS_MAX = 4;
export const FOOTER_NAV_LINKS_MAX = 6;

export const DEFAULT_FOOTER_NAV: FooterNavColumn[] = [
  {
    id: 'shop',
    enabled: true,
    title_ar: 'المتجر',
    title_en: 'Shop',
    links: [
      { label_ar: 'تصفح المتجر', label_en: 'Explore Store', href: '/store' },
      { label_ar: 'الاشتراكات', label_en: 'Subscriptions', href: '/subscriptions' },
      { label_ar: 'بطاقات الهدايا', label_en: 'Gift Cards', href: '/gift-cards' },
      { label_ar: 'قائمة المفضلة', label_en: 'Wishlist', href: '/wishlist' },
      { label_ar: 'سلة التسوق', label_en: 'Cart', href: '/cart' },
    ],
  },
  {
    id: 'site',
    enabled: true,
    title_ar: 'الموقع',
    title_en: 'Site',
    links: [
      { label_ar: 'من نحن', label_en: 'About us', href: '/about' },
      { label_ar: 'سياسة الخصوصية', label_en: 'Privacy policy', href: '/privacy' },
      { label_ar: 'شروط الخدمة', label_en: 'Terms of service', href: '/terms' },
      { label_ar: 'تسجيل الدخول', label_en: 'Log in', href: '/auth/login' },
      { label_ar: 'إنشاء حساب جديد', label_en: 'Sign up', href: '/auth/register' },
    ],
  },
  {
    id: 'resources',
    enabled: true,
    title_ar: 'الموارد',
    title_en: 'Resources',
    links: [
      { label_ar: 'التحديثات', label_en: 'Updates', href: '/updates' },
      { label_ar: 'الأدلة', label_en: 'Guides', href: '/dashboard/guides' },
    ],
  },
];

const ABOUT_FOOTER_LINK = {
  label_ar: 'من نحن',
  label_en: 'About us',
  href: '/about',
} as const;

const PRIVACY_FOOTER_LINK = {
  label_ar: 'سياسة الخصوصية',
  label_en: 'Privacy policy',
  href: '/privacy',
} as const;

const TERMS_FOOTER_LINK = {
  label_ar: 'شروط الخدمة',
  label_en: 'Terms of service',
  href: '/terms',
} as const;

const CART_FOOTER_LINK = {
  label_ar: 'السلة',
  label_en: 'Cart',
  href: '/cart',
} as const;

const UPDATES_FOOTER_LINK = {
  label_ar: 'التحديثات',
  label_en: 'Updates',
  href: '/updates',
} as const;

const GUIDES_FOOTER_LINK = {
  label_ar: 'الأدلة',
  label_en: 'Guides',
  href: '/dashboard/guides',
} as const;

function isResourcesColumn(c: FooterNavColumn): boolean {
  const en = c.title_en.trim().toLowerCase();
  const ar = c.title_ar.trim();
  return (
    c.id === 'resources' ||
    c.id === 'legal' ||
    en === 'resources' ||
    en === 'legal' ||
    ar === 'الموارد' ||
    ar === 'قانوني'
  );
}

function isShopColumn(c: FooterNavColumn): boolean {
  const en = c.title_en.trim().toLowerCase();
  const ar = c.title_ar.trim();
  return c.id === 'shop' || en === 'shop' || ar === 'المتجر';
}

function isSiteColumn(c: FooterNavColumn): boolean {
  const en = c.title_en.trim().toLowerCase();
  const ar = c.title_ar.trim();
  return (
    c.id === 'site' ||
    c.id === 'company' ||
    en === 'site' ||
    en === 'company' ||
    ar === 'الموقع' ||
    ar === 'الشركة'
  );
}

function pathOf(href: string): string {
  return href.replace(/\/$/, '') || '/';
}

/** About lives under Site; strip it from Resources if still there. */
function ensureAboutFooterLink(cols: FooterNavColumn[]): FooterNavColumn[] {
  const withoutAboutOnResources = cols.map((c) => {
    if (!isResourcesColumn(c)) return c;
    const links = c.links.filter((l) => pathOf(l.href) !== '/about');
    return links.length === c.links.length ? c : { ...c, links };
  });

  const hasSite = withoutAboutOnResources.some(isSiteColumn);
  if (!hasSite) return withoutAboutOnResources;

  return withoutAboutOnResources.map((c) => {
    if (!isSiteColumn(c)) return c;
    const idx = c.links.findIndex((l) => pathOf(l.href) === '/about');
    if (idx >= 0) {
      const cur = c.links[idx];
      if (
        cur.label_en === ABOUT_FOOTER_LINK.label_en &&
        cur.label_ar === ABOUT_FOOTER_LINK.label_ar
      ) {
        return c;
      }
      const links = c.links.slice();
      links[idx] = {
        ...cur,
        label_ar: ABOUT_FOOTER_LINK.label_ar,
        label_en: ABOUT_FOOTER_LINK.label_en,
      };
      return { ...c, links };
    }
    if (c.links.length >= FOOTER_NAV_LINKS_MAX) return c;
    return { ...c, links: [{ ...ABOUT_FOOTER_LINK }, ...c.links] };
  });
}

/** Cart lives under Shop; strip it from Site if still there. */
function ensureCartFooterLink(cols: FooterNavColumn[]): FooterNavColumn[] {
  const withoutCartOnSite = cols.map((c) => {
    if (!isSiteColumn(c)) return c;
    const links = c.links.filter((l) => pathOf(l.href) !== '/cart');
    return links.length === c.links.length ? c : { ...c, links };
  });

  const hasShop = withoutCartOnSite.some(isShopColumn);
  if (!hasShop) return withoutCartOnSite;

  return withoutCartOnSite.map((c) => {
    if (!isShopColumn(c)) return c;
    const idx = c.links.findIndex((l) => pathOf(l.href) === '/cart');
    if (idx >= 0) {
      const cur = c.links[idx];
      if (
        cur.label_en === CART_FOOTER_LINK.label_en &&
        cur.label_ar === CART_FOOTER_LINK.label_ar
      ) {
        return c;
      }
      const links = c.links.slice();
      links[idx] = {
        ...cur,
        label_ar: CART_FOOTER_LINK.label_ar,
        label_en: CART_FOOTER_LINK.label_en,
      };
      return { ...c, links };
    }
    if (c.links.length >= FOOTER_NAV_LINKS_MAX) return c;
    return { ...c, links: [...c.links, { ...CART_FOOTER_LINK }] };
  });
}

/** Privacy + Terms live under Site; strip from Resources if still there. */
function ensureLegalFooterLinks(cols: FooterNavColumn[]): FooterNavColumn[] {
  const legal = [PRIVACY_FOOTER_LINK, TERMS_FOOTER_LINK] as const;
  const legalPaths = new Set(legal.map((l) => pathOf(l.href)));

  const stripped = cols.map((c) => {
    if (!isResourcesColumn(c)) return c;
    const links = c.links.filter((l) => !legalPaths.has(pathOf(l.href)));
    return links.length === c.links.length ? c : { ...c, links };
  });

  if (!stripped.some(isSiteColumn)) return stripped;

  return stripped.map((c) => {
    if (!isSiteColumn(c)) return c;
    let links = c.links.slice();
    for (const def of legal) {
      const idx = links.findIndex((l) => pathOf(l.href) === pathOf(def.href));
      if (idx >= 0) {
        const cur = links[idx];
        if (cur.label_en !== def.label_en || cur.label_ar !== def.label_ar) {
          links[idx] = { ...cur, label_ar: def.label_ar, label_en: def.label_en };
        }
        continue;
      }
      if (links.length >= FOOTER_NAV_LINKS_MAX) continue;
      // After About when present, otherwise at start of column.
      const aboutIdx = links.findIndex((l) => pathOf(l.href) === '/about');
      const insertAt = aboutIdx >= 0 ? aboutIdx + 1 + legal.findIndex((x) => x.href === def.href) : links.length;
      links = [...links.slice(0, insertAt), { ...def }, ...links.slice(insertAt)];
    }
    return { ...c, links: links.slice(0, FOOTER_NAV_LINKS_MAX) };
  });
}

function ensureChangelogFooterLink(cols: FooterNavColumn[]): FooterNavColumn[] {
  return cols.map((c) => {
    if (!isResourcesColumn(c)) return c;
    const idx = c.links.findIndex((l) => {
      const path = l.href.replace(/\/$/, '');
      return path === '/updates' || path === '/changelog';
    });
    if (idx >= 0) {
      const cur = c.links[idx];
      const path = cur.href.replace(/\/$/, '');
      if (
        path === '/updates' &&
        cur.label_en === UPDATES_FOOTER_LINK.label_en &&
        cur.label_ar === UPDATES_FOOTER_LINK.label_ar
      ) {
        return c;
      }
      const links = c.links.slice();
      links[idx] = { ...cur, ...UPDATES_FOOTER_LINK };
      return { ...c, links };
    }
    if (c.links.length >= FOOTER_NAV_LINKS_MAX) return c;
    return { ...c, links: [...c.links, { ...UPDATES_FOOTER_LINK }] };
  });
}

function ensureGuidesFooterLink(cols: FooterNavColumn[]): FooterNavColumn[] {
  return cols.map((c) => {
    if (!isResourcesColumn(c)) return c;
    const idx = c.links.findIndex((l) => l.href.replace(/\/$/, '') === '/dashboard/guides');
    if (idx >= 0) {
      const cur = c.links[idx];
      if (
        cur.label_en === GUIDES_FOOTER_LINK.label_en &&
        cur.label_ar === GUIDES_FOOTER_LINK.label_ar
      ) {
        return c;
      }
      const links = c.links.slice();
      links[idx] = { ...cur, ...GUIDES_FOOTER_LINK };
      return { ...c, links };
    }
    if (c.links.length >= FOOTER_NAV_LINKS_MAX) return c;
    return { ...c, links: [...c.links, { ...GUIDES_FOOTER_LINK }] };
  });
}

function normalizeFooterLink(raw: unknown): FooterNavLink | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const href = typeof o.href === 'string' ? o.href.trim() : '';
  if (!href) return null;
  return {
    href,
    label_ar: typeof o.label_ar === 'string' ? o.label_ar : '',
    label_en: typeof o.label_en === 'string' ? o.label_en : '',
  };
}

export function parseFooterNav(raw: string): FooterNavColumn[] {
  if (!raw.trim()) return DEFAULT_FOOTER_NAV;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_FOOTER_NAV;
    const cols: FooterNavColumn[] = [];
    for (const item of parsed.slice(0, FOOTER_NAV_COLUMNS_MAX)) {
      if (!item || typeof item !== 'object') continue;
      const o = item as Record<string, unknown>;
      const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim() : `col-${cols.length + 1}`;
      const linksRaw = Array.isArray(o.links) ? o.links : [];
      const links = linksRaw
        .map(normalizeFooterLink)
        .filter((l): l is FooterNavLink => Boolean(l))
        .slice(0, FOOTER_NAV_LINKS_MAX);
      cols.push({
        id,
        enabled: o.enabled !== false,
        title_ar: typeof o.title_ar === 'string' ? o.title_ar : '',
        title_en: typeof o.title_en === 'string' ? o.title_en : '',
        links,
      });
    }
    // Rename legacy Legal → Resources; Company → Site.
    // About lives under Site (not Resources).
    const resourcesDefault = DEFAULT_FOOTER_NAV.find((c) => c.id === 'resources');
    const siteDefault = DEFAULT_FOOTER_NAV.find((c) => c.id === 'site');
    const normalized = cols.map((c) => {
      const isLegacyLegal =
        c.id === 'legal' ||
        c.title_en.trim().toLowerCase() === 'legal' ||
        c.title_ar.trim() === 'قانوني';
      if (isLegacyLegal && resourcesDefault) return { ...resourcesDefault, enabled: c.enabled };

      const isLegacyCompany =
        c.id === 'company' ||
        c.title_en.trim().toLowerCase() === 'company' ||
        c.title_ar.trim() === 'الشركة';
      if (isLegacyCompany && siteDefault) {
        return {
          ...siteDefault,
          enabled: c.enabled,
          links: c.links.length > 0 ? c.links : siteDefault.links,
        };
      }

      return c;
    });
    const withAbout = ensureAboutFooterLink(
      normalized.length > 0 ? normalized : DEFAULT_FOOTER_NAV
    );
    const withCart = ensureCartFooterLink(withAbout);
    const withLegal = ensureLegalFooterLinks(withCart);
    const withChangelog = ensureChangelogFooterLink(withLegal);
    return ensureGuidesFooterLink(withChangelog);
  } catch {
    return DEFAULT_FOOTER_NAV;
  }
}

export function parseSections(raw: string, defaults: PageSection[]): PageSection[] {
  if (!raw.trim()) return defaults;
  try {
    const parsed = JSON.parse(raw) as PageSection[];
    if (!Array.isArray(parsed)) return defaults;
    // Keep known fixed ids + dynamic category product sections (exact category_id grids).
    const known = parsed.filter(
      (s) =>
        s &&
        typeof s.id === 'string' &&
        (defaults.some((d) => d.id === s.id) || isCategoryProductsSection(s.id))
    );
    // Dedupe by id (first wins).
    const seen = new Set<string>();
    const deduped: PageSection[] = [];
    for (const s of known) {
      if (seen.has(s.id)) continue;
      seen.add(s.id);
      deduped.push({ id: s.id, enabled: s.enabled !== false });
    }
    const missing = defaults.filter((d) => !deduped.some((s) => s.id === d.id));
    const result = [...deduped];
    for (const item of missing) {
      const defIdx = defaults.findIndex((d) => d.id === item.id);
      const prevId = defIdx > 0 ? defaults[defIdx - 1].id : null;
      const prevIdx = prevId ? result.findIndex((s) => s.id === prevId) : -1;
      result.splice(prevIdx + 1, 0, item);
    }
    return result;
  } catch {
    return defaults;
  }
}

export const SITE_SETTING_DEFAULTS: SiteSettingsMap = {
  site_name: 'HEVEN.FUN',
  site_tagline: 'FUN MORE. PAY LESS.',
  site_tagline_ar: 'استمتع أكثر ادفع أقل',
  site_tagline_en: 'FUN MORE. PAY LESS.',
  hero_eyebrow_ar: 'مرحباً',
  hero_eyebrow_en: 'Welcome',
  hero_title_ar: 'استمتع أكثر',
  hero_title_en: 'FUN MORE',
  hero_subtitle_ar: 'ادفع أقل',
  hero_subtitle_en: 'PAY LESS',
  hero_desc_ar: 'ألعاب واشتراكات ومفاتيح رقمية — استمتع أكثر وادفع أقل.',
  hero_desc_en: 'Games, subscriptions, and digital keys — more fun, less spend.',
  footer_description_ar: '',
  footer_description_en: '',
  social_twitter: '',
  social_youtube: '',
  social_telegram: '',
  contact_email: '',
  brand_primary: '',
  brand_accent: '',
  brand_palette: 'default',
  /** Site-wide skin for first-time visitors. Owner can change; visitors may override locally. */
  default_skin: 'vault',
  /** Storefront rem density. Dashboard/auth stay at the 100% design baseline. */
  ui_scale: String(UI_SCALE_DEFAULT),
  about_title_ar: '',
  about_title_en: '',
  about_intro_ar: '',
  about_intro_en: '',
  about_items: JSON.stringify(DEFAULT_ABOUT_ITEMS),
  home_sections: JSON.stringify(DEFAULT_HOME_SECTIONS),
  store_sections: JSON.stringify(DEFAULT_STORE_SECTIONS),
  hero_media: '[]',
  hero_media_blur: '0',
  hero_media_softness: '18',
  hero_card_opacity: '100',
  hero_card_aura: 'dual',
  hero_bottom_fade: 'true',
  hero_bottom_fade_animate: 'false',
  hero_logo_placement: 'off',
  hero_logo_url: '',
  hero_enabled: 'true',
  hero_backdrop_enabled: 'true',
  home_ads_product_ids: '[]',
  home_ads_aura: 'dual',
  home_ads_interval_sec: String(HOME_ADS_INTERVAL_DEFAULT),
  home_ads_size: HOME_ADS_SIZE_DEFAULT,
  home_ads_blade_enabled: 'false',
  home_ads_blade_text_en: HOME_ADS_BLADE_TEXT_EN_DEFAULT,
  home_ads_blade_text_ar: HOME_ADS_BLADE_TEXT_AR_DEFAULT,
  home_ads_blade_size: HOME_ADS_BLADE_SIZE_DEFAULT,
  home_ads_blade_color: HOME_ADS_BLADE_COLOR_DEFAULT,
  home_ads_blade_opacity: String(HOME_ADS_BLADE_OPACITY_DEFAULT),
  home_ads_glare_hover: 'false',
  merch_motion_mode: 'auto',
  home_hover_cards_count: '3',
  home_hover_cards_mode: 'auto',
  home_hover_cards_product_ids: '[]',
  home_featured_product_ids: '[]',
  store_featured_product_ids: '[]',
  store_featured_mirror_home: 'false',
  store_category_tree_expand: 'false',
  product_find_more_enabled: 'true',
  product_find_more_mode: 'auto',
  product_find_more_slots: String(PRODUCT_FIND_MORE_SLOTS_DEFAULT),
  product_find_more_interval_sec: String(PRODUCT_FIND_MORE_INTERVAL_DEFAULT),
  product_find_more_product_ids: '[]',
  product_detail_fx_json: JSON.stringify(DEFAULT_PRODUCT_DETAIL_FX),
  product_hover_3d_json: '{"motion":5,"speed":5,"smooth":5}',
  product_author_lock: 'true',
  seller_daily_product_limit: '3',
  multi_account_roles_json: JSON.stringify(DEFAULT_MULTI_ACCOUNT_ROLES),
  drawer_categories_enabled: 'true',
  privacy_consent_banner: 'true',
  /** Days after owner approval before soft-purge. Cron runs daily; clamp 1–3650 in SQL. */
  account_deletion_grace_days: '30',
  privacy_policy_json: JSON.stringify(DEFAULT_PRIVACY_POLICY),
  terms_policy_json: JSON.stringify(DEFAULT_TERMS_POLICY),
  user_changelog_json: JSON.stringify(DEFAULT_USER_CHANGELOG),
  footer_nav: JSON.stringify(DEFAULT_FOOTER_NAV),
  plyr_json: JSON.stringify(DEFAULT_PLYR_CONFIG),
  /** Custom product_type catalog extras (builtins stay in productTypes.ts). */
  product_types_json: '[]',
  builder_presets: '[]',
  dashboard_stats_reset_at: '',
};

export function parseAboutItems(raw: string): AboutItem[] {
  if (!raw.trim()) return DEFAULT_ABOUT_ITEMS;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as AboutItem[];
    return DEFAULT_ABOUT_ITEMS;
  } catch {
    return DEFAULT_ABOUT_ITEMS;
  }
}

export async function fetchSiteSettings(): Promise<SiteSettingsMap> {
  const { data, error } = await supabase.from('site_settings').select('key, value');

  if (error) {
    console.warn('site_settings fetch failed:', error.message);
    return { ...SITE_SETTING_DEFAULTS };
  }

  const merged = { ...SITE_SETTING_DEFAULTS };
  for (const row of data ?? []) {
    if (row.key in merged && row.value != null) {
      merged[row.key as SiteSettingKey] = row.value;
    }
  }

  // Migrate retired / renamed brand lines still stored in site_settings.
  const legacy = /play more|have fun more|العب أكثر/i;
  if (legacy.test(merged.site_tagline)) merged.site_tagline = SITE_SETTING_DEFAULTS.site_tagline;
  if (legacy.test(merged.site_tagline_en)) merged.site_tagline_en = SITE_SETTING_DEFAULTS.site_tagline_en;
  if (legacy.test(merged.site_tagline_ar) || merged.site_tagline_ar.includes('مرح أكثر')) {
    merged.site_tagline_ar = SITE_SETTING_DEFAULTS.site_tagline_ar;
  }
  if (legacy.test(merged.hero_title_en)) merged.hero_title_en = SITE_SETTING_DEFAULTS.hero_title_en;
  if (legacy.test(merged.hero_title_ar) || merged.hero_title_ar.includes('مرح أكثر')) {
    merged.hero_title_ar = SITE_SETTING_DEFAULTS.hero_title_ar;
  }
  // Rewrite remaining Arabic "مرح أكثر" → "استمتع أكثر" (desc, footer, etc.)
  for (const key of Object.keys(merged) as SiteSettingKey[]) {
    const v = merged[key];
    if (typeof v === 'string' && v.includes('مرح أكثر')) {
      merged[key] = v.replaceAll('مرح أكثر', 'استمتع أكثر');
    }
  }
  // Drop trailing periods on hero title/subtitle defaults
  if (/^استمتع أكثر\.?$/.test(merged.hero_title_ar.trim())) {
    merged.hero_title_ar = 'استمتع أكثر';
  }
  if (/^ادفع أقل\.?$/.test(merged.hero_subtitle_ar.trim())) {
    merged.hero_subtitle_ar = 'ادفع أقل';
  }
  if (/^FUN MORE\.?$/i.test(merged.hero_title_en.trim())) {
    merged.hero_title_en = 'FUN MORE';
  }
  if (/^PAY LESS\.?$/i.test(merged.hero_subtitle_en.trim())) {
    merged.hero_subtitle_en = 'PAY LESS';
  }
  if (!merged.default_skin?.trim()) merged.default_skin = 'vault';

  return merged;
}

export async function saveSiteSettings(
  updates: Partial<SiteSettingsMap>,
  userId: string
): Promise<void> {
  const rows = Object.entries(updates).map(([key, value]) => ({
    key,
    value: value ?? '',
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
}

/** Valid ISO reset watermark, or null when unset / garbage. */
export function parseDashboardStatsResetAt(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

/**
 * Lower bound for dashboard store-sales stats.
 * Later of optional floor (e.g. last-7d chart) and stats reset watermark.
 */
export function dashboardStatsSinceIso(
  resetAt: string | null | undefined,
  floorIso?: string | null,
): string | null {
  const reset = parseDashboardStatsResetAt(resetAt ?? '');
  const floor = floorIso?.trim() ? parseDashboardStatsResetAt(floorIso) : null;
  if (reset && floor) return reset > floor ? reset : floor;
  return reset ?? floor;
}
