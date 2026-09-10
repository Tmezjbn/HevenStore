import { useEffect, useMemo, useState } from 'react';
import { Link, useBlocker, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Save,
  Loader2,
  Check,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Box,
  ImagePlus,
  Trash2,
  Film,
  RefreshCw,
  Plus,
  Bookmark,
  LayoutList,
  PanelBottom,
  Orbit,
  Clapperboard,
  Lock,
  Unlock,
  type LucideIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useSiteSettings, useSaveSiteSettings } from '../../hooks/useSiteSettings';
import { CATEGORY_COLS } from '../../lib/dbCols';
import HeroMediaBackdrop from '../../components/home/HeroMediaBackdrop';
import {
  parseSections,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_STORE_SECTIONS,
  parseHeroMedia,
  parseHeroMediaBlur,
  parseHeroMediaSoftness,
  parseHeroCardOpacity,
  parseHeroCardAura,
  parseHeroBottomFade,
  parseHeroBottomFadeAnimate,
  parseHeroLogoPlacement,
  parseHeroLogoUrl,
  parseHeroEnabled,
  parseHeroBackdropEnabled,
  parseHomeAdsProductIds,
  parseHomeAdsAura,
  parseHomeAdsIntervalSec,
  parseHomeAdsSize,
  parseHomeAdsBladeEnabled,
  parseHomeAdsBladeText,
  parseHomeAdsBladeSize,
  parseHomeAdsBladeColor,
  parseHomeAdsBladeOpacity,
  parseHomeAdsGlareHover,
  parseMerchMotionMode,
  MERCH_MOTION_MODES,
  type MerchMotionMode,
  HOME_ADS_SIZES,
  HOME_ADS_BLADE_SIZES,
  HOME_ADS_BLADE_TEXT_EN_DEFAULT,
  HOME_ADS_BLADE_TEXT_AR_DEFAULT,
  HOME_ADS_BLADE_TEXT_MAX,
  HOME_ADS_BLADE_COLOR_DEFAULT,
  type HomeAdsSize,
  type HomeAdsBladeSize,
  parseHomeHoverCardsCount,
  parseHomeHoverCardsMode,
  parseHomeHoverCardsProductIds,
  parseProductFindMoreEnabled,
  parseProductFindMoreMode,
  parseProductFindMoreSlots,
  parseProductFindMoreIntervalSec,
  parseProductFindMoreProductIds,
  parseDrawerCategoriesEnabled,
  parseStoreCategoryTreeExpand,
  HOME_ADS_MAX,
  HOME_ADS_INTERVAL_MIN,
  HOME_ADS_INTERVAL_MAX,
  HOME_HOVER_CARDS_MAX,
  PRODUCT_FIND_MORE_MAX,
  PRODUCT_FIND_MORE_INTERVAL_MIN,
  PRODUCT_FIND_MORE_INTERVAL_MAX,
  parsePrivacyConsentBanner,
  parseFooterNav,
  parsePlyrConfig,
  parseProductDetailFx,
  parseBuilderPresets,
  DEFAULT_PLYR_CONFIG,
  DEFAULT_PRODUCT_DETAIL_FX,
  DEFAULT_ATMOSPHERE_PAGES,
  DEFAULT_ATMOSPHERE_LOGO_IDS,
  PLYR_CONTROL_OPTIONS,
  BUILDER_PRESETS_MAX,
  BUILDER_PRESET_KEYS,
  DEFAULT_FOOTER_NAV,
  FOOTER_NAV_COLUMNS_MAX,
  FOOTER_NAV_LINKS_MAX,
  HERO_MEDIA_MAX,
  HERO_ZOOM_DEFAULT,
  HERO_ZOOM_MIN,
  HERO_ZOOM_MAX,
  clampHeroPos,
  clampHeroZoom,
  heroMediaPanStyle,
  categoryProductsSectionId,
  parseCategoryProductsSectionId,
  isCategoryProductsSection,
  HOME_CATEGORY_SECTIONS_MAX,
  STORE_CATEGORY_SECTIONS_MAX,
  parseFeaturedProductIds,
  parseStoreFeaturedMirrorHome,
  type PageSection,
  type HeroMediaItem,
  type HoverCardsMode,
  type ProductFindMoreMode,
  type HeroLogoPlacement,
  type FooterNavColumn,
  type PlyrSiteConfig,
  type PlyrControlId,
  type ProductDetailFxConfig,
  type AtmospherePageKey,
  type AtmosphereRouteKey,
  type AtmospherePatternId,
  type BuilderPreset,
  type BuilderPresetKey,
  clampAtmospherePatterns,
  ATMOSPHERE_ROUTE_KEYS,
  DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS,
  defaultAtmospherePageLayers,
} from '../../lib/siteSettings';
import { flattenCategoryTree, indentPrefix } from '../../lib/categories';
import { AURA_STYLES, type AuraStyle } from '../../lib/productEffects';
import {
  ATMOSPHERE_LOGO_CATALOG,
  ATMOSPHERE_LOGO_IDS,
  atmosphereLogoToneClass,
} from '../../lib/atmosphereLogos';
import type { Category, Product } from '../../types';
import { useQuery } from '@tanstack/react-query';

type BuilderProduct = Pick<
  Product,
  'id' | 'name' | 'name_ar' | 'thumbnail_url' | 'price' | 'status'
>;

const HERO_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm';
const HERO_MAX_BYTES = 20 * 1024 * 1024;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

const BUILDER_NAV: {
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

const SECTION_SHELL =
  'builder-section scroll-mt-28 rounded-lg border border-base-300 bg-base-200 p-4 sm:p-5 space-y-4';

const SECTION_TITLE =
  'text-lg font-semibold tracking-tight leading-tight text-balance flex items-center gap-2';

const SECTION_DESC = 'text-sm text-base-content/65 mt-1 text-pretty max-w-prose leading-relaxed';

function newMediaId() {
  return `hm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function kindFromFile(file: File): 'image' | 'video' {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

function kindFromUrl(url: string): 'image' | 'video' {
  if (/\.(mp4|webm|mov)(\?|#|$)/i.test(url)) return 'video';
  return 'image';
}

function normalizeEmbedUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function HeroRange({
  label,
  value,
  min,
  max,
  onChange,
  leftHint,
  rightHint,
  linkedNote,
  ariaLabel,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  leftHint: string;
  rightHint: string;
  linkedNote?: string;
  ariaLabel: string;
}) {
  return (
    <label className="flex w-full flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
      <span className="flex justify-between gap-2 text-xs font-semibold tracking-wide text-base-content/80">
        <span>
          {label}
          {linkedNote ? (
            <span className="ms-1.5 font-medium text-info">{linkedNote}</span>
          ) : null}
        </span>
        <span className="tabular-nums text-base-content/65">{value}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range range-primary range-xs"
        aria-label={ariaLabel}
      />
      <span className="flex justify-between text-xs text-base-content/55">
        <span>{leftHint}</span>
        <span>{rightHint}</span>
      </span>
    </label>
  );
}

type HeroEditorTab = 'panels' | 'look' | 'welcome';
type AtmosphereEditorTab = 'pages' | 'layers' | 'tune';
type SectionsEditorTab = 'order' | 'widgets' | 'site';

export default function WebsiteBuilderPage() {
  const { t, lang } = useI18n();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    settings,
    isLoading: settingsLoading,
    isPlaceholderData: settingsPlaceholder,
  } = useSiteSettings();
  const saveMutation = useSaveSiteSettings();

  const [homeSections, setHomeSections] = useState<PageSection[]>(
    parseSections(settings.home_sections, DEFAULT_HOME_SECTIONS)
  );
  const [storeSections, setStoreSections] = useState<PageSection[]>(
    parseSections(settings.store_sections, DEFAULT_STORE_SECTIONS)
  );
  const [addCategoryId, setAddCategoryId] = useState('');
  const [addStoreCategoryId, setAddStoreCategoryId] = useState('');
  const [sectionsSaved, setSectionsSaved] = useState(false);
  const [homeFeaturedIds, setHomeFeaturedIds] = useState<string[]>(() =>
    parseFeaturedProductIds(settings.home_featured_product_ids)
  );
  const [storeFeaturedIds, setStoreFeaturedIds] = useState<string[]>(() =>
    parseFeaturedProductIds(settings.store_featured_product_ids)
  );
  const [storeFeaturedMirror, setStoreFeaturedMirror] = useState(() =>
    parseStoreFeaturedMirrorHome(settings.store_featured_mirror_home)
  );
  const [adsProductIds, setAdsProductIds] = useState<string[]>(() =>
    parseHomeAdsProductIds(settings.home_ads_product_ids)
  );
  const [adsAura, setAdsAura] = useState<AuraStyle>(
    () => parseHomeAdsAura(settings.home_ads_aura) as AuraStyle
  );
  const [adsIntervalSec, setAdsIntervalSec] = useState(() =>
    parseHomeAdsIntervalSec(settings.home_ads_interval_sec)
  );
  const [adsSize, setAdsSize] = useState<HomeAdsSize>(() =>
    parseHomeAdsSize(settings.home_ads_size)
  );
  const [adsBladeEnabled, setAdsBladeEnabled] = useState(() =>
    parseHomeAdsBladeEnabled(settings.home_ads_blade_enabled)
  );
  const [adsBladeTextEn, setAdsBladeTextEn] = useState(() =>
    parseHomeAdsBladeText(settings.home_ads_blade_text_en, HOME_ADS_BLADE_TEXT_EN_DEFAULT)
  );
  const [adsBladeTextAr, setAdsBladeTextAr] = useState(() =>
    parseHomeAdsBladeText(settings.home_ads_blade_text_ar, HOME_ADS_BLADE_TEXT_AR_DEFAULT)
  );
  const [adsBladeSize, setAdsBladeSize] = useState<HomeAdsBladeSize>(() =>
    parseHomeAdsBladeSize(settings.home_ads_blade_size)
  );
  const [adsBladeColor, setAdsBladeColor] = useState(() =>
    parseHomeAdsBladeColor(settings.home_ads_blade_color)
  );
  const [adsBladeOpacity, setAdsBladeOpacity] = useState(() =>
    parseHomeAdsBladeOpacity(settings.home_ads_blade_opacity)
  );
  const [adsGlareHover, setAdsGlareHover] = useState(() =>
    parseHomeAdsGlareHover(settings.home_ads_glare_hover)
  );
  const [merchMotionMode, setMerchMotionMode] = useState<MerchMotionMode>(() =>
    parseMerchMotionMode(settings.merch_motion_mode)
  );
  const [adsSearch, setAdsSearch] = useState('');
  const [hoverCount, setHoverCount] = useState(() =>
    parseHomeHoverCardsCount(settings.home_hover_cards_count)
  );
  const [hoverMode, setHoverMode] = useState<HoverCardsMode>(() =>
    parseHomeHoverCardsMode(settings.home_hover_cards_mode)
  );
  const [hoverProductIds, setHoverProductIds] = useState<string[]>(() =>
    parseHomeHoverCardsProductIds(settings.home_hover_cards_product_ids)
  );
  const [hoverSearch, setHoverSearch] = useState('');
  const [findMoreEnabled, setFindMoreEnabled] = useState(() =>
    parseProductFindMoreEnabled(settings.product_find_more_enabled)
  );
  const [findMoreMode, setFindMoreMode] = useState<ProductFindMoreMode>(() =>
    parseProductFindMoreMode(settings.product_find_more_mode)
  );
  const [findMoreSlots, setFindMoreSlots] = useState(() =>
    parseProductFindMoreSlots(settings.product_find_more_slots)
  );
  const [findMoreIntervalSec, setFindMoreIntervalSec] = useState(() =>
    parseProductFindMoreIntervalSec(settings.product_find_more_interval_sec)
  );
  const [findMoreProductIds, setFindMoreProductIds] = useState<string[]>(() =>
    parseProductFindMoreProductIds(settings.product_find_more_product_ids)
  );
  const [findMoreSearch, setFindMoreSearch] = useState('');
  const [privacyBanner, setPrivacyBanner] = useState(() =>
    parsePrivacyConsentBanner(settings.privacy_consent_banner)
  );
  const [drawerCatsEnabled, setDrawerCatsEnabled] = useState(() =>
    parseDrawerCategoriesEnabled(settings.drawer_categories_enabled)
  );
  const [storeCatTreeExpand, setStoreCatTreeExpand] = useState(() =>
    parseStoreCategoryTreeExpand(settings.store_category_tree_expand)
  );
  const [plyrConfig, setPlyrConfig] = useState<PlyrSiteConfig>(() =>
    parsePlyrConfig(settings.plyr_json)
  );
  const [plyrSaved, setPlyrSaved] = useState(false);
  const [detailFx, setDetailFx] = useState<ProductDetailFxConfig>(() =>
    parseProductDetailFx(settings.product_detail_fx_json, ATMOSPHERE_LOGO_IDS)
  );
  const [detailFxSaved, setDetailFxSaved] = useState(false);
  const [logoPickerOpen, setLogoPickerOpen] = useState(false);
  const [atmosphereTab, setAtmosphereTab] = useState<AtmosphereEditorTab>('pages');
  const [sectionsTab, setSectionsTab] = useState<SectionsEditorTab>('order');

  // Old ?focus=featured bookmarks → catalog featuring menu.
  useEffect(() => {
    if (searchParams.get('focus') !== 'featured') return;
    navigate('/dashboard/products?feature=1', { replace: true });
  }, [searchParams, navigate]);

  const [logoEmbedUrl, setLogoEmbedUrl] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [presets, setPresets] = useState<BuilderPreset[]>(() =>
    parseBuilderPresets(settings.builder_presets)
  );
  const [presetName, setPresetName] = useState('');
  const [presetBusy, setPresetBusy] = useState(false);
  const [newPresetLocked, setNewPresetLocked] = useState(false);
  const [footerNav, setFooterNav] = useState<FooterNavColumn[]>(() =>
    parseFooterNav(settings.footer_nav)
  );
  const [footerSaved, setFooterSaved] = useState(false);

  const [heroMedia, setHeroMedia] = useState<HeroMediaItem[]>(() => parseHeroMedia(settings.hero_media));
  const [heroBlur, setHeroBlur] = useState(() => parseHeroMediaBlur(settings.hero_media_blur));
  const [heroSoftness, setHeroSoftness] = useState(() =>
    parseHeroMediaSoftness(settings.hero_media_softness)
  );
  const [heroCardOpacity, setHeroCardOpacity] = useState(() =>
    parseHeroCardOpacity(settings.hero_card_opacity)
  );
  const [heroCardAura, setHeroCardAura] = useState<AuraStyle>(
    () => parseHeroCardAura(settings.hero_card_aura) as AuraStyle
  );
  const [heroBottomFade, setHeroBottomFade] = useState(() =>
    parseHeroBottomFade(settings.hero_bottom_fade)
  );
  const [heroBottomFadeAnimate, setHeroBottomFadeAnimate] = useState(() =>
    parseHeroBottomFadeAnimate(settings.hero_bottom_fade_animate)
  );
  const [heroLogoPlacement, setHeroLogoPlacement] = useState<HeroLogoPlacement>(() =>
    parseHeroLogoPlacement(settings.hero_logo_placement)
  );
  const [heroLogoUrl, setHeroLogoUrl] = useState(() => parseHeroLogoUrl(settings.hero_logo_url));
  // Off until real settings sync — placeholder defaults are hero on.
  const [heroEnabled, setHeroEnabled] = useState(false);
  const [heroBackdropEnabled, setHeroBackdropEnabled] = useState(false);
  const [heroEmbedUrl, setHeroEmbedUrl] = useState('');
  const [heroFocusId, setHeroFocusId] = useState<string | null>(null);
  const [heroEditorTab, setHeroEditorTab] = useState<HeroEditorTab>('panels');
  const [heroZoomLinked, setHeroZoomLinked] = useState(false);

  useEffect(() => {
    if (heroMedia.length === 0) {
      if (heroFocusId) setHeroFocusId(null);
      return;
    }
    if (!heroFocusId || !heroMedia.some((m) => m.id === heroFocusId)) {
      setHeroFocusId(heroMedia[0].id);
    }
  }, [heroMedia, heroFocusId]);
  const [heroSaved, setHeroSaved] = useState(false);
  const [heroUploading, setHeroUploading] = useState(false);

  const [products, setProducts] = useState<BuilderProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsTick, setProductsTick] = useState(0);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    // Skip placeholder defaults — they flip toggles (e.g. hero on) then snap off.
    if (!settingsLoading && !settingsPlaceholder) {
      setHomeSections(parseSections(settings.home_sections, DEFAULT_HOME_SECTIONS));
      setStoreSections(parseSections(settings.store_sections, DEFAULT_STORE_SECTIONS));
      setHomeFeaturedIds(parseFeaturedProductIds(settings.home_featured_product_ids));
      setStoreFeaturedIds(parseFeaturedProductIds(settings.store_featured_product_ids));
      setStoreFeaturedMirror(parseStoreFeaturedMirrorHome(settings.store_featured_mirror_home));
      setAdsProductIds(parseHomeAdsProductIds(settings.home_ads_product_ids));
      setAdsAura(parseHomeAdsAura(settings.home_ads_aura) as AuraStyle);
      setAdsIntervalSec(parseHomeAdsIntervalSec(settings.home_ads_interval_sec));
      setAdsSize(parseHomeAdsSize(settings.home_ads_size));
      setAdsBladeEnabled(parseHomeAdsBladeEnabled(settings.home_ads_blade_enabled));
      setAdsBladeTextEn(
        parseHomeAdsBladeText(settings.home_ads_blade_text_en, HOME_ADS_BLADE_TEXT_EN_DEFAULT),
      );
      setAdsBladeTextAr(
        parseHomeAdsBladeText(settings.home_ads_blade_text_ar, HOME_ADS_BLADE_TEXT_AR_DEFAULT),
      );
      setAdsBladeSize(parseHomeAdsBladeSize(settings.home_ads_blade_size));
      setAdsBladeColor(parseHomeAdsBladeColor(settings.home_ads_blade_color));
      setAdsBladeOpacity(parseHomeAdsBladeOpacity(settings.home_ads_blade_opacity));
      setAdsGlareHover(parseHomeAdsGlareHover(settings.home_ads_glare_hover));
      setMerchMotionMode(parseMerchMotionMode(settings.merch_motion_mode));
      setHoverCount(parseHomeHoverCardsCount(settings.home_hover_cards_count));
      setHoverMode(parseHomeHoverCardsMode(settings.home_hover_cards_mode));
      setHoverProductIds(parseHomeHoverCardsProductIds(settings.home_hover_cards_product_ids));
      setFindMoreEnabled(parseProductFindMoreEnabled(settings.product_find_more_enabled));
      setFindMoreMode(parseProductFindMoreMode(settings.product_find_more_mode));
      setFindMoreSlots(parseProductFindMoreSlots(settings.product_find_more_slots));
      setFindMoreIntervalSec(parseProductFindMoreIntervalSec(settings.product_find_more_interval_sec));
      setFindMoreProductIds(parseProductFindMoreProductIds(settings.product_find_more_product_ids));
      setPrivacyBanner(parsePrivacyConsentBanner(settings.privacy_consent_banner));
      setDrawerCatsEnabled(parseDrawerCategoriesEnabled(settings.drawer_categories_enabled));
      setStoreCatTreeExpand(parseStoreCategoryTreeExpand(settings.store_category_tree_expand));
      setPlyrConfig(parsePlyrConfig(settings.plyr_json));
      setPlyrSaved(false);
      setDetailFx(parseProductDetailFx(settings.product_detail_fx_json, ATMOSPHERE_LOGO_IDS));
      setDetailFxSaved(false);
      setPresets(parseBuilderPresets(settings.builder_presets));
      setFooterNav(parseFooterNav(settings.footer_nav));
      setFooterSaved(false);
      setSectionsSaved(false);
      setHeroMedia(parseHeroMedia(settings.hero_media));
      setHeroBlur(parseHeroMediaBlur(settings.hero_media_blur));
      setHeroSoftness(parseHeroMediaSoftness(settings.hero_media_softness));
      setHeroCardOpacity(parseHeroCardOpacity(settings.hero_card_opacity));
      setHeroCardAura(parseHeroCardAura(settings.hero_card_aura) as AuraStyle);
      setHeroBottomFade(parseHeroBottomFade(settings.hero_bottom_fade));
      setHeroBottomFadeAnimate(parseHeroBottomFadeAnimate(settings.hero_bottom_fade_animate));
      setHeroLogoPlacement(parseHeroLogoPlacement(settings.hero_logo_placement));
      setHeroLogoUrl(parseHeroLogoUrl(settings.hero_logo_url));
      setHeroEnabled(parseHeroEnabled(settings.hero_enabled));
      setHeroBackdropEnabled(parseHeroBackdropEnabled(settings.hero_backdrop_enabled));
      setHeroSaved(false);
    }
  }, [
    settings.home_sections,
    settings.store_sections,
    settings.home_featured_product_ids,
    settings.store_featured_product_ids,
    settings.store_featured_mirror_home,
    settings.home_ads_product_ids,
    settings.home_ads_aura,
    settings.home_ads_interval_sec,
    settings.home_ads_size,
    settings.home_ads_blade_enabled,
    settings.home_ads_blade_text_en,
    settings.home_ads_blade_text_ar,
    settings.home_ads_blade_size,
    settings.home_ads_blade_color,
    settings.home_ads_blade_opacity,
    settings.home_ads_glare_hover,
    settings.merch_motion_mode,
    settings.home_hover_cards_count,
    settings.home_hover_cards_mode,
    settings.home_hover_cards_product_ids,
    settings.product_find_more_enabled,
    settings.product_find_more_mode,
    settings.product_find_more_slots,
    settings.product_find_more_interval_sec,
    settings.product_find_more_product_ids,
    settings.privacy_consent_banner,
    settings.drawer_categories_enabled,
    settings.store_category_tree_expand,
    settings.plyr_json,
    settings.product_detail_fx_json,
    settings.builder_presets,
    settings.footer_nav,
    settings.hero_media,
    settings.hero_media_blur,
    settings.hero_media_softness,
    settings.hero_card_opacity,
    settings.hero_card_aura,
    settings.hero_bottom_fade,
    settings.hero_bottom_fade_animate,
    settings.hero_logo_placement,
    settings.hero_logo_url,
    settings.hero_enabled,
    settings.hero_backdrop_enabled,
    settingsLoading,
    settingsPlaceholder,
  ]);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setProductsLoading(true);
      const { data, error: err } = await supabase
        .from('products')
        .select('id, name, name_ar, thumbnail_url, price, status')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        if (!opts?.silent) setProducts([]);
      } else {
        setProducts(data ?? []);
      }
      if (!opts?.silent) setProductsLoading(false);
    };

    void loadProducts();

    const onFocus = () => {
      void loadProducts({ silent: true });
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [t, productsTick]);

  const sectionsDirty =
    JSON.stringify(homeSections) !== JSON.stringify(parseSections(settings.home_sections, DEFAULT_HOME_SECTIONS)) ||
    JSON.stringify(storeSections) !== JSON.stringify(parseSections(settings.store_sections, DEFAULT_STORE_SECTIONS)) ||
    JSON.stringify(homeFeaturedIds) !==
      JSON.stringify(parseFeaturedProductIds(settings.home_featured_product_ids)) ||
    JSON.stringify(storeFeaturedIds) !==
      JSON.stringify(parseFeaturedProductIds(settings.store_featured_product_ids)) ||
    storeFeaturedMirror !== parseStoreFeaturedMirrorHome(settings.store_featured_mirror_home) ||
    JSON.stringify(adsProductIds) !== JSON.stringify(parseHomeAdsProductIds(settings.home_ads_product_ids)) ||
    adsAura !== parseHomeAdsAura(settings.home_ads_aura) ||
    adsIntervalSec !== parseHomeAdsIntervalSec(settings.home_ads_interval_sec) ||
    adsSize !== parseHomeAdsSize(settings.home_ads_size) ||
    adsBladeEnabled !== parseHomeAdsBladeEnabled(settings.home_ads_blade_enabled) ||
    adsBladeTextEn !==
      parseHomeAdsBladeText(settings.home_ads_blade_text_en, HOME_ADS_BLADE_TEXT_EN_DEFAULT) ||
    adsBladeTextAr !==
      parseHomeAdsBladeText(settings.home_ads_blade_text_ar, HOME_ADS_BLADE_TEXT_AR_DEFAULT) ||
    adsBladeSize !== parseHomeAdsBladeSize(settings.home_ads_blade_size) ||
    adsBladeColor !== parseHomeAdsBladeColor(settings.home_ads_blade_color) ||
    adsBladeOpacity !== parseHomeAdsBladeOpacity(settings.home_ads_blade_opacity) ||
    adsGlareHover !== parseHomeAdsGlareHover(settings.home_ads_glare_hover) ||
    merchMotionMode !== parseMerchMotionMode(settings.merch_motion_mode) ||
    hoverCount !== parseHomeHoverCardsCount(settings.home_hover_cards_count) ||
    hoverMode !== parseHomeHoverCardsMode(settings.home_hover_cards_mode) ||
    JSON.stringify(hoverProductIds) !== JSON.stringify(parseHomeHoverCardsProductIds(settings.home_hover_cards_product_ids)) ||
    findMoreEnabled !== parseProductFindMoreEnabled(settings.product_find_more_enabled) ||
    findMoreMode !== parseProductFindMoreMode(settings.product_find_more_mode) ||
    findMoreSlots !== parseProductFindMoreSlots(settings.product_find_more_slots) ||
    findMoreIntervalSec !== parseProductFindMoreIntervalSec(settings.product_find_more_interval_sec) ||
    JSON.stringify(findMoreProductIds) !==
      JSON.stringify(parseProductFindMoreProductIds(settings.product_find_more_product_ids)) ||
    privacyBanner !== parsePrivacyConsentBanner(settings.privacy_consent_banner) ||
    drawerCatsEnabled !== parseDrawerCategoriesEnabled(settings.drawer_categories_enabled) ||
    storeCatTreeExpand !== parseStoreCategoryTreeExpand(settings.store_category_tree_expand);

  const footerDirty =
    JSON.stringify(footerNav) !== JSON.stringify(parseFooterNav(settings.footer_nav));

  const heroDirty =
    JSON.stringify(heroMedia) !== JSON.stringify(parseHeroMedia(settings.hero_media)) ||
    heroBlur !== parseHeroMediaBlur(settings.hero_media_blur) ||
    heroSoftness !== parseHeroMediaSoftness(settings.hero_media_softness) ||
    heroCardOpacity !== parseHeroCardOpacity(settings.hero_card_opacity) ||
    heroCardAura !== parseHeroCardAura(settings.hero_card_aura) ||
    heroBottomFade !== parseHeroBottomFade(settings.hero_bottom_fade) ||
    heroBottomFadeAnimate !== parseHeroBottomFadeAnimate(settings.hero_bottom_fade_animate) ||
    heroLogoPlacement !== parseHeroLogoPlacement(settings.hero_logo_placement) ||
    heroLogoUrl !== parseHeroLogoUrl(settings.hero_logo_url) ||
    heroEnabled !== parseHeroEnabled(settings.hero_enabled) ||
    heroBackdropEnabled !== parseHeroBackdropEnabled(settings.hero_backdrop_enabled);

  const plyrDirty =
    JSON.stringify(plyrConfig) !== JSON.stringify(parsePlyrConfig(settings.plyr_json));

  const detailFxDirty =
    JSON.stringify(detailFx) !==
    JSON.stringify(parseProductDetailFx(settings.product_detail_fx_json, ATMOSPHERE_LOGO_IDS));

  const builderDirty =
    sectionsDirty ||
    footerDirty ||
    heroDirty ||
    plyrDirty ||
    detailFxDirty;

  useEffect(() => {
    if (!builderDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [builderDirty]);

  const leaveBlocker = useBlocker(builderDirty);
  useEffect(() => {
    if (leaveBlocker.state !== 'blocked') return;
    const ok = window.confirm(
      t(
        'لديك تغييرات غير محفوظة. مغادرة الصفحة؟',
        'You have unsaved changes. Leave this page?',
      ),
    );
    if (ok) leaveBlocker.proceed();
    else leaveBlocker.reset();
  }, [leaveBlocker, t]);

  const toggleSection = (
    setter: React.Dispatch<React.SetStateAction<PageSection[]>>,
    id: string
  ) => {
    setter((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
    setSectionsSaved(false);
  };

  const moveSection = (
    setter: React.Dispatch<React.SetStateAction<PageSection[]>>,
    index: number,
    dir: -1 | 1
  ) => {
    setter((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSectionsSaved(false);
  };

  const removeHomeSection = (id: string) => {
    if (!isCategoryProductsSection(id)) return;
    setHomeSections((prev) => prev.filter((s) => s.id !== id));
    setSectionsSaved(false);
  };

  const removeStoreSection = (id: string) => {
    if (!isCategoryProductsSection(id)) return;
    setStoreSections((prev) => prev.filter((s) => s.id !== id));
    setSectionsSaved(false);
  };

  const { data: builderCategories = [] } = useQuery({
    queryKey: ['categories', 'builder'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select(CATEGORY_COLS)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Category[];
    },
    staleTime: 1000 * 60 * 2,
  });

  const categoryTree = useMemo(() => flattenCategoryTree(builderCategories), [builderCategories]);

  const homeSectionLabels = useMemo(() => {
    const labels: Record<string, string> = {
      categories: t('الفئات', 'Categories'),
      ads: t('بانر الإعلانات', 'Ad banners'),
      featured: t('منتجات مميزة', 'Featured Products'),
      products: t('المنتجات', 'Products'),
      hover_cards: t('بطاقات تفاعلية', 'Hover cards'),
      cta: t('دعوة التسجيل', 'Sign-up CTA'),
    };
    for (const s of homeSections) {
      const catId = parseCategoryProductsSectionId(s.id);
      if (!catId) continue;
      const cat = builderCategories.find((c) => c.id === catId);
      const name = cat
        ? lang === 'ar'
          ? cat.name_ar || cat.name
          : cat.name
        : catId.slice(0, 8);
      labels[s.id] = t(`منتجات: ${name}`, `Products: ${name}`);
    }
    return labels;
  }, [homeSections, builderCategories, t, lang]);

  const usedCategorySectionIds = useMemo(
    () =>
      new Set(
        homeSections
          .map((s) => parseCategoryProductsSectionId(s.id))
          .filter((id): id is string => Boolean(id))
      ),
    [homeSections]
  );

  const categorySectionCount = usedCategorySectionIds.size;

  const storeSectionLabels = useMemo(() => {
    const labels: Record<string, string> = {
      search: t('شريط البحث', 'Search bar'),
      sort: t('قائمة الترتيب', 'Sort menu'),
    };
    for (const s of storeSections) {
      const catId = parseCategoryProductsSectionId(s.id);
      if (!catId) continue;
      const cat = builderCategories.find((c) => c.id === catId);
      const name = cat
        ? lang === 'ar'
          ? cat.name_ar || cat.name
          : cat.name
        : catId.slice(0, 8);
      labels[s.id] = t(`منتجات: ${name}`, `Products: ${name}`);
    }
    return labels;
  }, [storeSections, builderCategories, t, lang]);

  const usedStoreCategorySectionIds = useMemo(
    () =>
      new Set(
        storeSections
          .map((s) => parseCategoryProductsSectionId(s.id))
          .filter((id): id is string => Boolean(id))
      ),
    [storeSections]
  );

  const storeCategorySectionCount = usedStoreCategorySectionIds.size;

  const addCategorySection = () => {
    if (!addCategoryId) return;
    if (usedCategorySectionIds.has(addCategoryId)) return;
    if (categorySectionCount >= HOME_CATEGORY_SECTIONS_MAX) return;
    const id = categoryProductsSectionId(addCategoryId);
    setHomeSections((prev) => {
      const productsIdx = prev.findIndex((s) => s.id === 'products');
      const entry = { id, enabled: true };
      if (productsIdx < 0) return [...prev, entry];
      const next = [...prev];
      next.splice(productsIdx + 1, 0, entry);
      return next;
    });
    setAddCategoryId('');
    setSectionsSaved(false);
  };

  const addStoreCategorySection = () => {
    if (!addStoreCategoryId) return;
    if (usedStoreCategorySectionIds.has(addStoreCategoryId)) return;
    if (storeCategorySectionCount >= STORE_CATEGORY_SECTIONS_MAX) return;
    const id = categoryProductsSectionId(addStoreCategoryId);
    setStoreSections((prev) => [...prev, { id, enabled: true }]);
    setAddStoreCategoryId('');
    setSectionsSaved(false);
  };

  const saveSections = async () => {
    if (!user || !sectionsDirty) return;
    try {
      await saveMutation.mutateAsync({
        updates: {
          home_sections: JSON.stringify(homeSections),
          store_sections: JSON.stringify(storeSections),
          home_featured_product_ids: JSON.stringify(homeFeaturedIds),
          store_featured_product_ids: JSON.stringify(storeFeaturedIds),
          store_featured_mirror_home: storeFeaturedMirror ? 'true' : 'false',
          home_ads_product_ids: JSON.stringify(adsProductIds),
          home_ads_aura: adsAura,
          home_ads_interval_sec: String(adsIntervalSec),
          home_ads_size: adsSize,
          home_ads_blade_enabled: adsBladeEnabled ? 'true' : 'false',
          home_ads_blade_text_en: adsBladeTextEn.trim() || HOME_ADS_BLADE_TEXT_EN_DEFAULT,
          home_ads_blade_text_ar: adsBladeTextAr.trim() || HOME_ADS_BLADE_TEXT_AR_DEFAULT,
          home_ads_blade_size: adsBladeSize,
          home_ads_blade_color: adsBladeColor || HOME_ADS_BLADE_COLOR_DEFAULT,
          home_ads_blade_opacity: String(adsBladeOpacity),
          home_ads_glare_hover: adsGlareHover ? 'true' : 'false',
          merch_motion_mode: merchMotionMode,
          home_hover_cards_count: String(hoverCount),
          home_hover_cards_mode: hoverMode,
          home_hover_cards_product_ids: JSON.stringify(hoverProductIds),
          product_find_more_enabled: findMoreEnabled ? 'true' : 'false',
          product_find_more_mode: findMoreMode,
          product_find_more_slots: String(findMoreSlots),
          product_find_more_interval_sec: String(findMoreIntervalSec),
          product_find_more_product_ids: JSON.stringify(findMoreProductIds),
          privacy_consent_banner: privacyBanner ? 'true' : 'false',
          drawer_categories_enabled: drawerCatsEnabled ? 'true' : 'false',
          store_category_tree_expand: storeCatTreeExpand ? 'true' : 'false',
        },
        userId: user.id,
      });
      setSectionsSaved(true);
    } catch {
      setSectionsSaved(false);
    }
  };

  const saveFooterNav = async () => {
    if (!user || !footerDirty) return;
    setError('');
    try {
      await saveMutation.mutateAsync({
        updates: { footer_nav: JSON.stringify(footerNav) },
        userId: user.id,
      });
      setFooterSaved(true);
      setOkMsg(t('تم حفظ التذييل', 'Footer saved'));
    } catch (e) {
      setFooterSaved(false);
      setError(e instanceof Error ? e.message : t('فشل الحفظ', 'Save failed'));
    }
  };

  const patchFooterColumn = (id: string, patch: Partial<FooterNavColumn>) => {
    setFooterNav((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setFooterSaved(false);
  };

  const moveFooterColumn = (index: number, dir: -1 | 1) => {
    setFooterNav((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setFooterSaved(false);
  };

  const addFooterColumn = () => {
    if (footerNav.length >= FOOTER_NAV_COLUMNS_MAX) return;
    const n = footerNav.length + 1;
    setFooterNav((prev) => [
      ...prev,
      {
        id: `col-${Date.now()}`,
        enabled: true,
        title_ar: `عمود ${n}`,
        title_en: `Column ${n}`,
        links: [{ label_ar: 'رابط', label_en: 'Link', href: '/' }],
      },
    ]);
    setFooterSaved(false);
  };

  const removeFooterColumn = (id: string) => {
    setFooterNav((prev) => prev.filter((c) => c.id !== id));
    setFooterSaved(false);
  };

  const addFooterLink = (colId: string) => {
    setFooterNav((prev) =>
      prev.map((c) => {
        if (c.id !== colId || c.links.length >= FOOTER_NAV_LINKS_MAX) return c;
        return {
          ...c,
          links: [...c.links, { label_ar: '', label_en: '', href: '/' }],
        };
      })
    );
    setFooterSaved(false);
  };

  const patchFooterLink = (
    colId: string,
    linkIndex: number,
    patch: Partial<{ label_ar: string; label_en: string; href: string }>
  ) => {
    setFooterNav((prev) =>
      prev.map((c) => {
        if (c.id !== colId) return c;
        const links = c.links.map((l, i) => (i === linkIndex ? { ...l, ...patch } : l));
        return { ...c, links };
      })
    );
    setFooterSaved(false);
  };

  const removeFooterLink = (colId: string, linkIndex: number) => {
    setFooterNav((prev) =>
      prev.map((c) =>
        c.id === colId ? { ...c, links: c.links.filter((_, i) => i !== linkIndex) } : c
      )
    );
    setFooterSaved(false);
  };

  const saveHeroMedia = async () => {
    if (!user || !heroDirty) return;
    setError('');
    try {
      await saveMutation.mutateAsync({
        updates: {
          hero_media: JSON.stringify(heroMedia),
          hero_media_blur: String(heroBlur),
          hero_media_softness: String(heroSoftness),
          hero_card_opacity: String(heroCardOpacity),
          hero_card_aura: heroCardAura,
          hero_bottom_fade: heroBottomFade ? 'true' : 'false',
          hero_bottom_fade_animate: heroBottomFadeAnimate ? 'true' : 'false',
          hero_logo_placement: heroLogoPlacement,
          hero_logo_url: heroLogoUrl,
          hero_enabled: heroEnabled ? 'true' : 'false',
          hero_backdrop_enabled: heroBackdropEnabled ? 'true' : 'false',
        },
        userId: user.id,
      });
      setHeroSaved(true);
      setOkMsg(t('تم حفظ خلفية البطل', 'Hero backdrop saved'));
    } catch (e) {
      setHeroSaved(false);
      setError(
        e instanceof Error
          ? e.message
          : t('فشل حفظ خلفية البطل', 'Failed to save hero backdrop')
      );
    }
  };

  const savePlyr = async () => {
    if (!user || !plyrDirty) return;
    setError('');
    try {
      await saveMutation.mutateAsync({
        updates: { plyr_json: JSON.stringify(plyrConfig) },
        userId: user.id,
      });
      setPlyrSaved(true);
      setOkMsg(t('تم حفظ مشغّل الفيديو', 'Video player saved'));
    } catch (e) {
      setPlyrSaved(false);
      setError(
        e instanceof Error ? e.message : t('فشل حفظ مشغّل الفيديو', 'Failed to save video player')
      );
    }
  };

  const saveDetailFx = async () => {
    if (!user || !detailFxDirty) return;
    setError('');
    try {
      await saveMutation.mutateAsync({
        updates: { product_detail_fx_json: JSON.stringify(detailFx) },
        userId: user.id,
      });
      setDetailFxSaved(true);
      setOkMsg(t('تم حفظ أجواء صفحة المنتج', 'Product page atmosphere saved'));
    } catch (e) {
      setDetailFxSaved(false);
      setError(
        e instanceof Error
          ? e.message
          : t('فشل حفظ أجواء صفحة المنتج', 'Failed to save product page atmosphere')
      );
    }
  };

  const captureCurrentSnapshot = (): Partial<Record<BuilderPresetKey, string>> => {
    const snap: Partial<Record<BuilderPresetKey, string>> = {
      home_sections: JSON.stringify(homeSections),
      store_sections: JSON.stringify(storeSections),
      home_featured_product_ids: JSON.stringify(homeFeaturedIds),
      store_featured_product_ids: JSON.stringify(storeFeaturedIds),
      store_featured_mirror_home: storeFeaturedMirror ? 'true' : 'false',
      hero_media: JSON.stringify(heroMedia),
      hero_media_blur: String(heroBlur),
      hero_media_softness: String(heroSoftness),
      hero_card_opacity: String(heroCardOpacity),
      hero_card_aura: heroCardAura,
      hero_bottom_fade: heroBottomFade ? 'true' : 'false',
      hero_bottom_fade_animate: heroBottomFadeAnimate ? 'true' : 'false',
      hero_logo_placement: heroLogoPlacement,
      hero_logo_url: heroLogoUrl,
      hero_enabled: heroEnabled ? 'true' : 'false',
      hero_backdrop_enabled: heroBackdropEnabled ? 'true' : 'false',
      home_ads_product_ids: JSON.stringify(adsProductIds),
      home_ads_aura: adsAura,
      home_ads_interval_sec: String(adsIntervalSec),
      home_ads_size: adsSize,
      home_ads_blade_enabled: adsBladeEnabled ? 'true' : 'false',
      home_ads_blade_text_en: adsBladeTextEn.trim() || HOME_ADS_BLADE_TEXT_EN_DEFAULT,
      home_ads_blade_text_ar: adsBladeTextAr.trim() || HOME_ADS_BLADE_TEXT_AR_DEFAULT,
      home_ads_blade_size: adsBladeSize,
      home_ads_blade_color: adsBladeColor || HOME_ADS_BLADE_COLOR_DEFAULT,
      home_ads_blade_opacity: String(adsBladeOpacity),
      home_ads_glare_hover: adsGlareHover ? 'true' : 'false',
      merch_motion_mode: merchMotionMode,
      home_hover_cards_count: String(hoverCount),
      home_hover_cards_mode: hoverMode,
      home_hover_cards_product_ids: JSON.stringify(hoverProductIds),
      product_find_more_enabled: findMoreEnabled ? 'true' : 'false',
      product_find_more_mode: findMoreMode,
      product_find_more_slots: String(findMoreSlots),
      product_find_more_interval_sec: String(findMoreIntervalSec),
      product_find_more_product_ids: JSON.stringify(findMoreProductIds),
      privacy_consent_banner: privacyBanner ? 'true' : 'false',
      drawer_categories_enabled: drawerCatsEnabled ? 'true' : 'false',
      store_category_tree_expand: storeCatTreeExpand ? 'true' : 'false',
      footer_nav: JSON.stringify(footerNav),
      plyr_json: JSON.stringify(plyrConfig),
      product_detail_fx_json: JSON.stringify(detailFx),
      product_hover_3d_json: settings.product_hover_3d_json ?? '',
    };
    return snap;
  };

  const persistPresets = async (next: BuilderPreset[], msg: string) => {
    if (!user) return;
    setPresetBusy(true);
    setError('');
    try {
      await saveMutation.mutateAsync({
        updates: { builder_presets: JSON.stringify(next) },
        userId: user.id,
      });
      setPresets(next);
      setOkMsg(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('فشل حفظ الإعدادات المسبقة', 'Failed to save presets'));
    }
    setPresetBusy(false);
  };

  const saveCurrentAsPreset = async () => {
    if (presets.length >= BUILDER_PRESETS_MAX) {
      setError(t(`الحد الأقصى ${BUILDER_PRESETS_MAX} إعدادات مسبقة`, `Maximum ${BUILDER_PRESETS_MAX} presets`));
      return;
    }
    const name = presetName.trim() || `Preset ${presets.length + 1}`;
    const next: BuilderPreset[] = [
      ...presets,
      {
        id: `p-${Date.now()}`,
        name,
        locked: newPresetLocked,
        updated_at: new Date().toISOString(),
        snapshot: captureCurrentSnapshot(),
      },
    ];
    await persistPresets(next, t('تم حفظ الإعداد المسبق', 'Preset saved'));
    setPresetName('');
    setNewPresetLocked(false);
  };

  const updatePreset = async (id: string) => {
    const next = presets.map((p) =>
      p.id === id
        ? { ...p, snapshot: captureCurrentSnapshot(), updated_at: new Date().toISOString() }
        : p
    );
    await persistPresets(next, t('تم تحديث الإعداد المسبق', 'Preset updated'));
  };

  const togglePresetLock = async (id: string) => {
    const next = presets.map((p) => (p.id === id ? { ...p, locked: !p.locked } : p));
    await persistPresets(next, t('تم تحديث القفل', 'Lock updated'));
  };

  const removePreset = async (id: string) => {
    const target = presets.find((p) => p.id === id);
    if (!target) return;
    if (target.locked) {
      setError(t('هذا الإعداد محمي من الحذف — ألغِ القفل أولاً', 'This preset is protected — unlock it first'));
      return;
    }
    await persistPresets(
      presets.filter((p) => p.id !== id),
      t('تم حذف الإعداد المسبق', 'Preset removed')
    );
  };

  const applyPreset = async (preset: BuilderPreset) => {
    if (!user) return;
    if (builderDirty) {
      const ok = window.confirm(
        t(
          'تطبيق الإعداد يستبدل التغييرات غير المحفوظة. متابعة؟',
          'Applying this preset replaces unsaved changes. Continue?',
        ),
      );
      if (!ok) return;
    }
    setPresetBusy(true);
    setError('');
    try {
      const updates: Partial<Record<BuilderPresetKey, string>> = {};
      for (const key of BUILDER_PRESET_KEYS) {
        const v = preset.snapshot[key];
        if (typeof v === 'string') updates[key] = v;
      }
      if (Object.keys(updates).length === 0) {
        setError(t('هذا الإعداد فارغ', 'This preset is empty'));
        setPresetBusy(false);
        return;
      }
      await saveMutation.mutateAsync({ updates, userId: user.id });
      // Hydrate local form immediately (settings sync follows query invalidate).
      if (updates.home_sections) setHomeSections(parseSections(updates.home_sections, DEFAULT_HOME_SECTIONS));
      if (updates.store_sections) setStoreSections(parseSections(updates.store_sections, DEFAULT_STORE_SECTIONS));
      if (updates.home_featured_product_ids) {
        setHomeFeaturedIds(parseFeaturedProductIds(updates.home_featured_product_ids));
      }
      if (updates.store_featured_product_ids) {
        setStoreFeaturedIds(parseFeaturedProductIds(updates.store_featured_product_ids));
      }
      if (updates.store_featured_mirror_home != null) {
        setStoreFeaturedMirror(parseStoreFeaturedMirrorHome(updates.store_featured_mirror_home));
      }
      if (updates.hero_media) setHeroMedia(parseHeroMedia(updates.hero_media));
      if (updates.hero_media_blur != null) setHeroBlur(parseHeroMediaBlur(updates.hero_media_blur));
      if (updates.hero_media_softness != null) setHeroSoftness(parseHeroMediaSoftness(updates.hero_media_softness));
      if (updates.hero_card_opacity != null) setHeroCardOpacity(parseHeroCardOpacity(updates.hero_card_opacity));
      if (updates.hero_card_aura) setHeroCardAura(parseHeroCardAura(updates.hero_card_aura) as AuraStyle);
      if (updates.hero_bottom_fade != null) setHeroBottomFade(parseHeroBottomFade(updates.hero_bottom_fade));
      if (updates.hero_bottom_fade_animate != null) {
        setHeroBottomFadeAnimate(parseHeroBottomFadeAnimate(updates.hero_bottom_fade_animate));
      }
      if (updates.hero_logo_placement) setHeroLogoPlacement(parseHeroLogoPlacement(updates.hero_logo_placement));
      if (updates.hero_logo_url != null) setHeroLogoUrl(parseHeroLogoUrl(updates.hero_logo_url));
      if (updates.hero_enabled != null) setHeroEnabled(parseHeroEnabled(updates.hero_enabled));
      if (updates.hero_backdrop_enabled != null) {
        setHeroBackdropEnabled(parseHeroBackdropEnabled(updates.hero_backdrop_enabled));
      }
      if (updates.home_ads_product_ids) setAdsProductIds(parseHomeAdsProductIds(updates.home_ads_product_ids));
      if (updates.home_ads_aura) setAdsAura(parseHomeAdsAura(updates.home_ads_aura) as AuraStyle);
      if (updates.home_ads_interval_sec != null) {
        setAdsIntervalSec(parseHomeAdsIntervalSec(updates.home_ads_interval_sec));
      }
      if (updates.home_ads_size != null) setAdsSize(parseHomeAdsSize(updates.home_ads_size));
      if (updates.home_ads_blade_enabled != null) {
        setAdsBladeEnabled(parseHomeAdsBladeEnabled(updates.home_ads_blade_enabled));
      }
      if (updates.home_ads_blade_text_en != null) {
        setAdsBladeTextEn(
          parseHomeAdsBladeText(updates.home_ads_blade_text_en, HOME_ADS_BLADE_TEXT_EN_DEFAULT),
        );
      }
      if (updates.home_ads_blade_text_ar != null) {
        setAdsBladeTextAr(
          parseHomeAdsBladeText(updates.home_ads_blade_text_ar, HOME_ADS_BLADE_TEXT_AR_DEFAULT),
        );
      }
      if (updates.home_ads_blade_size != null) {
        setAdsBladeSize(parseHomeAdsBladeSize(updates.home_ads_blade_size));
      }
      if (updates.home_ads_blade_color != null) {
        setAdsBladeColor(parseHomeAdsBladeColor(updates.home_ads_blade_color));
      }
      if (updates.home_ads_blade_opacity != null) {
        setAdsBladeOpacity(parseHomeAdsBladeOpacity(updates.home_ads_blade_opacity));
      }
      if (updates.home_ads_glare_hover != null) {
        setAdsGlareHover(parseHomeAdsGlareHover(updates.home_ads_glare_hover));
      }
      if (updates.merch_motion_mode != null) {
        setMerchMotionMode(parseMerchMotionMode(updates.merch_motion_mode));
      }
      if (updates.home_hover_cards_count != null) {
        setHoverCount(parseHomeHoverCardsCount(updates.home_hover_cards_count));
      }
      if (updates.home_hover_cards_mode) setHoverMode(parseHomeHoverCardsMode(updates.home_hover_cards_mode));
      if (updates.home_hover_cards_product_ids) {
        setHoverProductIds(parseHomeHoverCardsProductIds(updates.home_hover_cards_product_ids));
      }
      if (updates.product_find_more_enabled != null) {
        setFindMoreEnabled(parseProductFindMoreEnabled(updates.product_find_more_enabled));
      }
      if (updates.product_find_more_mode) {
        setFindMoreMode(parseProductFindMoreMode(updates.product_find_more_mode));
      }
      if (updates.product_find_more_slots != null) {
        setFindMoreSlots(parseProductFindMoreSlots(updates.product_find_more_slots));
      }
      if (updates.product_find_more_interval_sec != null) {
        setFindMoreIntervalSec(parseProductFindMoreIntervalSec(updates.product_find_more_interval_sec));
      }
      if (updates.product_find_more_product_ids) {
        setFindMoreProductIds(parseProductFindMoreProductIds(updates.product_find_more_product_ids));
      }
      if (updates.privacy_consent_banner != null) {
        setPrivacyBanner(parsePrivacyConsentBanner(updates.privacy_consent_banner));
      }
      if (updates.privacy_consent_banner != null) {
        setPrivacyBanner(parsePrivacyConsentBanner(updates.privacy_consent_banner));
      }
      if (updates.drawer_categories_enabled != null) {
        setDrawerCatsEnabled(parseDrawerCategoriesEnabled(updates.drawer_categories_enabled));
      }
      if (updates.store_category_tree_expand != null) {
        setStoreCatTreeExpand(parseStoreCategoryTreeExpand(updates.store_category_tree_expand));
      }
      if (updates.footer_nav) setFooterNav(parseFooterNav(updates.footer_nav));
      if (updates.plyr_json) setPlyrConfig(parsePlyrConfig(updates.plyr_json));
      if (updates.product_detail_fx_json) {
        setDetailFx(parseProductDetailFx(updates.product_detail_fx_json, ATMOSPHERE_LOGO_IDS));
      }
      setHeroSaved(true);
      setSectionsSaved(true);
      setFooterSaved(true);
      setPlyrSaved(true);
      setDetailFxSaved(true);
      setOkMsg(t(`تم تطبيق «${preset.name}»`, `Applied “${preset.name}”`));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('فشل تطبيق الإعداد', 'Failed to apply preset'));
    }
    setPresetBusy(false);
  };

  const togglePlyrControl = (id: PlyrControlId) => {
    setPlyrConfig((prev) => {
      const has = prev.controls.includes(id);
      const controls = has ? prev.controls.filter((c) => c !== id) : [...prev.controls, id];
      return {
        ...prev,
        controls: controls.length > 0 ? controls : [...DEFAULT_PLYR_CONFIG.controls],
      };
    });
    setPlyrSaved(false);
  };

  const uploadHeroFile = async (file: File) => {
    if (!user) return;
    if (heroMedia.length >= HERO_MEDIA_MAX) {
      setError(t(`الحد الأقصى ${HERO_MEDIA_MAX} ملفات`, `Maximum ${HERO_MEDIA_MAX} media files`));
      return;
    }
    if (file.size > HERO_MAX_BYTES) {
      setError(t('الحد الأقصى للملف 20 ميغابايت', 'Max file size is 20MB'));
      return;
    }
    const okType =
      file.type.startsWith('image/') ||
      file.type === 'video/mp4' ||
      file.type === 'video/webm';
    if (!okType) {
      setError(t('صيغة غير مدعومة — صورة أو GIF أو MP4', 'Unsupported type — image, GIF, or MP4'));
      return;
    }

    setHeroUploading(true);
    setError('');
    setOkMsg('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || (file.type.startsWith('video/') ? 'mp4' : 'jpg');
      const path = `hero/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('site-media')
        .upload(path, file, { cacheControl: '31536000', upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('site-media').getPublicUrl(path);
      setHeroMedia((prev) => [
        ...prev,
        { id: newMediaId(), url: data.publicUrl, kind: kindFromFile(file), pos_x: 50, pos_y: 50, zoom: HERO_ZOOM_DEFAULT },
      ]);
      setHeroSaved(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg.includes('Bucket not found') || msg.toLowerCase().includes('not found')
          ? t(
              'رفع الملفات يحتاج إعداد تخزين مرة واحدة في Supabase. أو الصق رابط وسائط أدناه — بدون إعداد.',
              'Uploads need a one-time storage setup in Supabase. Or paste a media link below — no setup needed.',
            )
          : msg || t('فشل الرفع', 'Upload failed')
      );
    }
    setHeroUploading(false);
  };

  const uploadAtmosphereLogo = async (file: File) => {
    if (!user) return;
    if (detailFx.customLogos.length >= 24) {
      setError(t('الحد الأقصى 24 شعاراً مخصصاً', 'Maximum 24 custom logos'));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t('الحد الأقصى للشعار 2 ميغابايت', 'Max logo size is 2MB'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError(t('صيغة غير مدعومة — صورة PNG/JPG/WebP/SVG', 'Unsupported type — PNG/JPG/WebP/SVG'));
      return;
    }
    setLogoUploading(true);
    setError('');
    setOkMsg('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `atmosphere-logos/${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('site-media')
        .upload(path, file, { cacheControl: '31536000', upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('site-media').getPublicUrl(path);
      const id = `custom-${Date.now().toString(36)}`;
      const label = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || id;
      setDetailFx((p) => ({
        ...p,
        enabled: true,
        logo: true,
        customLogos: [...p.customLogos, { id, src: data.publicUrl, labelEn: label, labelAr: label }],
        logoIds: [...p.logoIds, id],
      }));
      setDetailFxSaved(false);
      setLogoPickerOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        msg.includes('Bucket not found') || msg.toLowerCase().includes('not found')
          ? t(
              'رفع الملفات يحتاج إعداد تخزين مرة واحدة في Supabase. أو الصق رابط صورة أدناه.',
              'Uploads need a one-time storage setup in Supabase. Or paste an image URL below.',
            )
          : msg || t('فشل الرفع', 'Upload failed'),
      );
    }
    setLogoUploading(false);
  };

  const embedAtmosphereLogoUrl = () => {
    if (detailFx.customLogos.length >= 24) {
      setError(t('الحد الأقصى 24 شعاراً مخصصاً', 'Maximum 24 custom logos'));
      return;
    }
    const url = normalizeEmbedUrl(logoEmbedUrl);
    if (!url) {
      setError(t('الصق رابط https لصورة الشعار', 'Paste an https link to a logo image'));
      return;
    }
    const id = `custom-${Date.now().toString(36)}`;
    let label = 'Logo';
    try {
      const path = new URL(url).pathname.split('/').pop() || 'Logo';
      label = decodeURIComponent(path.replace(/\.[^.]+$/, '')).slice(0, 40) || 'Logo';
    } catch {
      /* keep default */
    }
    setDetailFx((p) => ({
      ...p,
      enabled: true,
      logo: true,
      customLogos: [...p.customLogos, { id, src: url, labelEn: label, labelAr: label }],
      logoIds: [...p.logoIds, id],
    }));
    setLogoEmbedUrl('');
    setDetailFxSaved(false);
    setLogoPickerOpen(true);
    setError('');
    setOkMsg('');
  };

  const embedHeroUrl = () => {
    if (heroMedia.length >= HERO_MEDIA_MAX) {
      setError(t(`الحد الأقصى ${HERO_MEDIA_MAX} ملفات`, `Maximum ${HERO_MEDIA_MAX} media files`));
      return;
    }
    const url = normalizeEmbedUrl(heroEmbedUrl);
    if (!url) {
      setError(t('الصق رابط https صالحاً لصورة أو GIF أو فيديو', 'Paste a valid https link to an image, GIF, or video'));
      return;
    }
    setError('');
    setHeroMedia((prev) => [
      ...prev,
      { id: newMediaId(), url, kind: kindFromUrl(url), pos_x: 50, pos_y: 50, zoom: HERO_ZOOM_DEFAULT },
    ]);
    setHeroEmbedUrl('');
    setHeroSaved(false);
    setOkMsg('');
  };

  const moveHeroMedia = (index: number, dir: -1 | 1) => {
    setHeroMedia((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setHeroSaved(false);
  };

  const removeHeroMedia = (id: string) => {
    setHeroMedia((prev) => prev.filter((m) => m.id !== id));
    setHeroFocusId((cur) => (cur === id ? null : cur));
    setHeroSaved(false);
  };

  const setHeroMediaPos = (id: string, axis: 'pos_x' | 'pos_y', value: number) => {
    const v = clampHeroPos(value);
    setHeroMedia((prev) => prev.map((m) => (m.id === id ? { ...m, [axis]: v } : m)));
    setHeroFocusId(id);
    setHeroSaved(false);
  };

  const setHeroMediaZoom = (id: string, value: number) => {
    const z = clampHeroZoom(value);
    setHeroMedia((prev) =>
      heroZoomLinked
        ? prev.map((m) => ({ ...m, zoom: z }))
        : prev.map((m) => (m.id === id ? { ...m, zoom: z } : m)),
    );
    setHeroFocusId(id);
    setHeroSaved(false);
  };

  const resetHeroMediaPos = (id: string) => {
    setHeroMedia((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, pos_x: 50, pos_y: 50, zoom: HERO_ZOOM_DEFAULT } : m,
      ),
    );
    setHeroFocusId(id);
    setHeroSaved(false);
  };

  const resetAllHeroMediaPos = () => {
    setHeroMedia((prev) =>
      prev.map((m) => ({ ...m, pos_x: 50, pos_y: 50, zoom: HERO_ZOOM_DEFAULT })),
    );
    setHeroSaved(false);
  };

  if (settingsLoading) {
  return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="builder-page-enter max-w-5xl mx-auto w-full text-start space-y-6">
      <nav
        className="sticky top-0 z-20 -mx-1 px-1 py-2.5 bg-base-100 border-b border-base-300"
        aria-label={t('أقسام البنّاء', 'Builder sections')}
      >
        <ul className="flex flex-wrap gap-1.5">
          {BUILDER_NAV.map(({ id, ar, en, Icon, tone }) => (
            <li key={id}>
              <button
                type="button"
                className={`btn btn-xs gap-1.5 border bg-base-200/80 ${tone} ${focusRing}`}
                onClick={() => jumpTo(id)}
              >
                <Icon size={12} aria-hidden />
                <span className="font-semibold tracking-tight">{t(ar, en)}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {(error || okMsg) && (
        <div
          role="status"
          className={`alert text-sm py-2 ${error ? 'alert-error' : 'alert-success'}`}
        >
          {error || okMsg}
        </div>
      )}

      {/* Builder presets */}
      <section id="builder-presets" className={SECTION_SHELL} aria-labelledby="builder-presets-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 id="builder-presets-title" className={SECTION_TITLE}>
            <span className="size-8 rounded-lg border border-primary/35 bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bookmark size={15} aria-hidden />
            </span>
            {t('إعدادات مسبقة', 'Presets')}
            <span
              className={`badge badge-sm font-semibold tabular-nums ${
                presets.length >= BUILDER_PRESETS_MAX ? 'badge-warning' : 'badge-ghost'
              }`}
            >
              {presets.length}/{BUILDER_PRESETS_MAX}
            </span>
          </h3>
        </div>

        <div
          className={`rounded-lg border p-3 sm:p-4 space-y-3 ${
            presets.length >= BUILDER_PRESETS_MAX
              ? 'border-warning/40 bg-warning/5'
              : 'border-base-300 bg-base-100'
          }`}
        >
          <p className="text-xs font-semibold tracking-wide text-base-content/70">
            {presets.length >= BUILDER_PRESETS_MAX
              ? t('الحد ممتلئ — احذف إعداداً أولاً', 'Slots full — remove one first')
              : t('حفظ الحالة الحالية', 'Save current state')}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              className={`input input-bordered input-sm flex-1 min-w-0 ${focusRing}`}
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t('اسم الإعداد المسبق', 'Preset name')}
              maxLength={48}
              disabled={presets.length >= BUILDER_PRESETS_MAX}
              aria-label={t('اسم الإعداد المسبق', 'Preset name')}
            />
            <button
              type="button"
              className={`btn btn-xs border gap-1 self-start sm:self-auto ${focusRing} ${
                newPresetLocked
                  ? 'border-warning/45 bg-warning/15 text-warning'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              aria-pressed={newPresetLocked}
              disabled={presets.length >= BUILDER_PRESETS_MAX}
              onClick={() => setNewPresetLocked((v) => !v)}
            >
              {newPresetLocked ? <Lock size={12} aria-hidden /> : <Unlock size={12} aria-hidden />}
              {t('حماية', 'Protect')}
            </button>
            <button
              type="button"
              className={`btn btn-primary btn-sm gap-1.5 self-start sm:self-auto ${focusRing}`}
              disabled={presetBusy || saveMutation.isPending || presets.length >= BUILDER_PRESETS_MAX}
              onClick={saveCurrentAsPreset}
            >
              {presetBusy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {t('حفظ الحالي', 'Save current')}
            </button>
          </div>
        </div>

        {presets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 px-6 py-10 text-center space-y-2">
            <Bookmark size={28} className="mx-auto text-base-content/35" aria-hidden />
            <p className="text-base font-semibold tracking-tight">
              {t('لا إعدادات مسبقة', 'No presets yet')}
            </p>
            <p className="text-sm text-base-content/65 text-pretty max-w-sm mx-auto">
              {t(
                'احفظ البطل والأقسام والتذييل والمشغّل كإعداد واحد.',
                'Snapshot hero, sections, footer, and player as one preset.',
              )}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5" role="list">
            {presets.map((p) => (
              <li
                key={p.id}
                className={`preset-card rounded-lg border p-3 sm:p-4 space-y-3 transition-colors ${
                  p.locked
                    ? 'border-warning/40 bg-warning/5'
                    : 'border-base-300 bg-base-100'
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold tracking-tight truncate leading-snug">
                      {p.name}
                    </p>
                    <p className="text-sm text-base-content/65 tabular-nums">
                      {new Date(p.updated_at).toLocaleString(lang === 'ar' ? 'ar' : 'en')}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`btn btn-xs border gap-1 ${focusRing} ${
                      p.locked
                        ? 'border-warning/45 bg-warning/15 text-warning'
                        : 'btn-ghost border-base-300 text-base-content/70'
                    }`}
                    aria-pressed={p.locked}
                    disabled={presetBusy || saveMutation.isPending}
                    onClick={() => togglePresetLock(p.id)}
                    title={
                      p.locked
                        ? t('إلغاء الحماية', 'Unlock')
                        : t('حماية من الحذف', 'Protect from delete')
                    }
                  >
                    {p.locked ? <Lock size={12} aria-hidden /> : <Unlock size={12} aria-hidden />}
                    {p.locked ? t('محمي', 'Protected') : t('غير محمي', 'Unlocked')}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    className={`btn btn-primary btn-sm gap-1 ${focusRing}`}
                    disabled={presetBusy || saveMutation.isPending}
                    onClick={() => applyPreset(p)}
                  >
                    <Check size={12} aria-hidden />
                    {t('تطبيق', 'Apply')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline btn-sm gap-1 ${focusRing}`}
                    disabled={presetBusy || saveMutation.isPending}
                    onClick={() => updatePreset(p.id)}
                  >
                    <RefreshCw size={12} aria-hidden />
                    {t('تحديث', 'Update')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-sm gap-1 text-error border border-transparent hover:border-error/30 ${focusRing}`}
                    disabled={p.locked || presetBusy || saveMutation.isPending}
                    title={
                      p.locked
                        ? t('محمي من الحذف', 'Protected from delete')
                        : t('حذف', 'Remove')
                    }
                    onClick={() => removePreset(p.id)}
                  >
                    <Trash2 size={12} aria-hidden />
                    {t('حذف', 'Remove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Hero backdrop media */}
      <section id="builder-hero" className={SECTION_SHELL} aria-labelledby="builder-hero-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
            <h3 id="builder-hero-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-info/40 bg-info/10 text-info flex items-center justify-center shrink-0">
                <Film size={15} aria-hidden />
              </span>
              {t('خلفية البطل', 'Hero backdrop')}
              <span className="badge badge-ghost badge-sm font-semibold tabular-nums">
                {heroMedia.length}/{HERO_MEDIA_MAX}
              </span>
            </h3>
      </div>
          <button
            type="button"
            onClick={saveHeroMedia}
            disabled={!heroDirty || saveMutation.isPending}
            className={`btn btn-primary btn-sm gap-1.5 self-start ${focusRing}`}
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : heroSaved && !heroDirty ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {heroSaved && !heroDirty
              ? t('تم الحفظ', 'Saved')
              : t('حفظ الخلفية', 'Save backdrop')}
          </button>
    </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('محرّر البطل', 'Hero editor')}>
          {(
            [
              { id: 'panels' as const, ar: 'اللوحات', en: 'Panels' },
              { id: 'look' as const, ar: 'المظهر', en: 'Look' },
              { id: 'welcome' as const, ar: 'الترحيب', en: 'Welcome' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={heroEditorTab === tab.id}
              className={`btn btn-xs gap-1 border ${focusRing} ${
                heroEditorTab === tab.id
                  ? 'border-info/40 bg-info/10 text-info'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              onClick={() => setHeroEditorTab(tab.id)}
            >
              <span className="font-semibold tracking-tight">{t(tab.ar, tab.en)}</span>
            </button>
          ))}
        </div>

        {heroMedia.length > 0 ? (
          <div className="hero-preview-dock sticky top-[3.25rem] z-10 rounded-lg border border-base-300 bg-base-100 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <p className="text-xs font-semibold tracking-wide text-base-content/80">
                {t('معاينة حية', 'Live preview')}
              </p>
              <button
                type="button"
                className={`btn btn-ghost btn-xs ${focusRing}`}
                disabled={heroMedia.every(
                  (m) =>
                    clampHeroPos(m.pos_x) === 50 &&
                    clampHeroPos(m.pos_y) === 50 &&
                    clampHeroZoom(m.zoom) === HERO_ZOOM_DEFAULT,
                )}
                onClick={resetAllHeroMediaPos}
              >
                {t('إعادة الكل', 'Reset all')}
              </button>
            </div>
            <div className="relative aspect-[21/9] w-full rounded-lg overflow-hidden border border-base-300 bg-base-300/40">
              <HeroMediaBackdrop
                items={heroMedia}
                blur={heroBlur}
                softness={heroSoftness}
                highlightId={heroFocusId}
                previewSharp={heroEditorTab !== 'look'}
              />
            </div>
          </div>
        ) : null}

        {heroEditorTab === 'panels' ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <label
                className={`btn btn-outline btn-sm gap-1.5 ${focusRing} ${
                  heroMedia.length >= HERO_MEDIA_MAX || heroUploading ? 'btn-disabled' : ''
                }`}
              >
                {heroUploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                {t('رفع ملف', 'Upload file')}
                <input
                  type="file"
                  accept={HERO_ACCEPT}
                  className="hidden"
                  disabled={heroMedia.length >= HERO_MEDIA_MAX || heroUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadHeroFile(file);
                    e.target.value = '';
                  }}
                />
              </label>
              <div className="flex flex-1 gap-2 min-w-0">
                <input
                  type="url"
                  value={heroEmbedUrl}
                  onChange={(e) => setHeroEmbedUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      embedHeroUrl();
                    }
                  }}
                  placeholder={t('الصق رابط صورة / GIF / فيديو…', 'Paste image / GIF / video URL…')}
                  className="input input-bordered input-sm w-full font-mono text-xs"
                  dir="ltr"
                  disabled={heroMedia.length >= HERO_MEDIA_MAX}
                  aria-label={t('رابط الوسائط', 'Media URL')}
                />
                <button
                  type="button"
                  className={`btn btn-outline btn-sm shrink-0 ${focusRing}`}
                  disabled={heroMedia.length >= HERO_MEDIA_MAX || !heroEmbedUrl.trim()}
                  onClick={embedHeroUrl}
                >
                  {t('تضمين', 'Embed')}
                </button>
              </div>
            </div>

            {heroMedia.length === 0 ? (
              <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 px-6 py-10 text-center space-y-2">
                <Film size={28} className="mx-auto text-base-content/35" aria-hidden />
                <p className="text-base font-semibold tracking-tight">
                  {t('لا وسائط بعد', 'No media yet')}
                </p>
                <p className="text-sm text-base-content/65">
                  {t('يظهر التدرج الافتراضي حتى ترفع أو تضمّن.', 'Default gradient shows until you upload or embed.')}
                </p>
              </div>
            ) : (
              <>
                <label className="flex items-center gap-2 cursor-pointer w-fit rounded-lg border border-base-300 bg-base-100 px-3 py-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={heroZoomLinked}
                    onChange={(e) => setHeroZoomLinked(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-base-content/80">
                    {t('ربط التكبير بين اللوحات', 'Link zoom across panels')}
                  </span>
                </label>

                <ul className="space-y-2.5" role="list">
                  {heroMedia.map((m, i) => {
                    const px = clampHeroPos(m.pos_x);
                    const py = clampHeroPos(m.pos_y);
                    const zoom = clampHeroZoom(m.zoom);
                    const pan = heroMediaPanStyle(m);
                    const focused = heroFocusId === m.id;
                    const isDefault =
                      px === 50 && py === 50 && zoom === HERO_ZOOM_DEFAULT;
                    return (
                      <li
                        key={m.id}
                        className={`hero-panel rounded-lg border overflow-hidden transition-colors ${
                          focused
                            ? 'border-info/50 bg-info/5'
                            : 'border-base-300 bg-base-100'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2.5 p-3 cursor-pointer ${focusRing}`}
                          onClick={() => setHeroFocusId(m.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setHeroFocusId(m.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="relative w-16 h-12 rounded-md overflow-hidden bg-base-300/50 shrink-0 border border-base-300">
                            {m.kind === 'video' ? (
                              <video
                                key={`thumb-v-${m.id}-${pan.transform}`}
                                src={m.url}
                                className="w-full h-full"
                                style={pan}
                                muted
                                playsInline
                              />
                            ) : (
                              <img
                                key={`thumb-i-${m.id}-${pan.transform}`}
                                src={m.url}
                                alt=""
                                className="w-full h-full"
                                style={pan}
                              />
                            )}
                            <span
                              className="absolute size-2 rounded-full bg-info ring-2 ring-base-100 pointer-events-none"
                              style={{
                                left: `${px}%`,
                                top: `${py}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                              aria-hidden
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold tracking-tight truncate">
                              {m.kind === 'video' ? t('فيديو', 'Video') : t('صورة', 'Image')}
                              <span className="ms-1.5 text-xs font-medium text-base-content/55 tabular-nums">
                                {i + 1}/{heroMedia.length}
                              </span>
                            </p>
                            <p
                              className="text-xs text-base-content/55 truncate font-mono"
                              dir="ltr"
                              title={m.url}
                            >
                              {m.url}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                              disabled={i === 0}
                              onClick={() => moveHeroMedia(i, -1)}
                              aria-label={t('أعلى', 'Up')}
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                              disabled={i === heroMedia.length - 1}
                              onClick={() => moveHeroMedia(i, 1)}
                              aria-label={t('أسفل', 'Down')}
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                              onClick={() => removeHeroMedia(m.id)}
                              aria-label={t('حذف', 'Remove')}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {focused ? (
                          <div className="border-t border-base-300 px-3 py-3 space-y-3 bg-base-200/40">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <HeroRange
                                label={t('أفقي', 'Horizontal')}
                                value={px}
                                min={0}
                                max={100}
                                onChange={(n) => setHeroMediaPos(m.id, 'pos_x', n)}
                                leftHint={t('يسار', 'Left')}
                                rightHint={t('يمين', 'Right')}
                                ariaLabel={t('موضع أفقي', 'Horizontal position')}
                              />
                              <HeroRange
                                label={t('عمودي', 'Vertical')}
                                value={py}
                                min={0}
                                max={100}
                                onChange={(n) => setHeroMediaPos(m.id, 'pos_y', n)}
                                leftHint={t('أعلى', 'Top')}
                                rightHint={t('أسفل', 'Bottom')}
                                ariaLabel={t('موضع عمودي', 'Vertical position')}
                              />
                              <div className="sm:col-span-2">
                                <HeroRange
                                  label={t('تكبير', 'Zoom')}
                                  value={zoom}
                                  min={HERO_ZOOM_MIN}
                                  max={HERO_ZOOM_MAX}
                                  onChange={(n) => setHeroMediaZoom(m.id, n)}
                                  leftHint={t('بعيد', 'Out')}
                                  rightHint={t('قريب', 'In')}
                                  linkedNote={
                                    heroZoomLinked ? t('(مرتبط)', '(linked)') : undefined
                                  }
                                  ariaLabel={t('تكبير', 'Zoom')}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                className={`btn btn-ghost btn-xs ${focusRing}`}
                                disabled={isDefault}
                                onClick={() => resetHeroMediaPos(m.id)}
                              >
                                {t('إعادة للافتراضي', 'Reset to defaults')}
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        ) : null}

        {heroEditorTab === 'look' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-1">
              <HeroRange
                label={t('التمويه', 'Blur')}
                value={heroBlur}
                min={0}
                max={100}
                onChange={(n) => {
                  setHeroBlur(n);
                  setHeroSaved(false);
                }}
                leftHint="0%"
                rightHint="100%"
                ariaLabel={t('تمويه الخلفية', 'Backdrop blur')}
              />
            </div>
            <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-1">
              <HeroRange
                label={t('نعومة الحواف', 'Edge softness')}
                value={heroSoftness}
                min={0}
                max={100}
                onChange={(n) => {
                  setHeroSoftness(n);
                  setHeroSaved(false);
                }}
                leftHint={t('حاد', 'Hard')}
                rightHint={t('ناعم', 'Soft')}
                ariaLabel={t('نعومة حواف الخلفية', 'Backdrop edge softness')}
              />
            </div>
          </div>
        ) : null}

        {heroEditorTab === 'welcome' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={heroEnabled}
                  onChange={(e) => {
                    setHeroEnabled(e.target.checked);
                    setHeroSaved(false);
                  }}
                />
                <span className="text-sm font-semibold tracking-tight">
                  {t('إظهار بطاقة الترحيب', 'Show welcome card')}
                </span>
              </label>
              <p className="text-xs text-base-content/55 text-pretty ps-7 -mt-2">
                {t(
                  'إيقافها يخفي البطاقة فقط — خلفية البطل تبقى.',
                  'Off hides the card only — hero backdrop stays.',
                )}
              </p>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={heroBackdropEnabled}
                  onChange={(e) => {
                    setHeroBackdropEnabled(e.target.checked);
                    setHeroSaved(false);
                  }}
                />
                <span className="text-sm font-semibold tracking-tight">
                  {t('إظهار خلفية البطل', 'Show hero backdrop')}
                </span>
              </label>
              <p className="text-xs text-base-content/55 text-pretty ps-7 -mt-2">
                {t(
                  'إيقافها يخفي الصورة/الفيديو والغطاء — البطاقة تقدر تبقى لوحدها.',
                  'Off hides media/gradient wash — the card can stay alone.',
                )}
              </p>

              <div className="border-t border-base-300 pt-4 space-y-2">
                <p className="text-xs font-semibold tracking-wide text-base-content/80">
                  {t('أجواء داخل البطاقة', 'Atmosphere inside card')}
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm checkbox-primary"
                    checked={detailFx.pages.heroWelcome}
                    onChange={(e) => {
                      setDetailFx((p) => ({
                        ...p,
                        enabled: true,
                        pages: { ...p.pages, heroWelcome: e.target.checked },
                      }));
                      setDetailFxSaved(false);
                    }}
                  />
                  <span className="text-sm font-medium">
                    {t('تفعيل الأنماط / الجزيئات / الشعارات هنا', 'Enable patterns / particles / logos here')}
                  </span>
                </label>
                {detailFx.pages.heroWelcome ? (
                  <div className="flex flex-wrap gap-1.5 ps-7">
                    {(
                      [
                        ['grid', t('أنماط', 'Patterns'), detailFx.grid],
                        ['particles', t('جزيئات', 'Particles'), detailFx.particles],
                        ['logo', t('شعار', 'Logo'), detailFx.logo],
                      ] as const
                    ).map(([layer, layerLabel, masterOn]) => {
                      const on =
                        detailFx.chromeLayers?.heroWelcome?.[layer] ??
                        DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS[layer];
                      return (
                        <button
                          key={layer}
                          type="button"
                          disabled={!masterOn}
                          className={`btn btn-xs border ${focusRing} ${
                            on && masterOn
                              ? 'border-success/40 bg-success/15 text-success'
                              : 'btn-ghost border-base-300 text-base-content/65'
                          }`}
                          aria-pressed={on}
                          onClick={() => {
                            setDetailFx((p) => ({
                              ...p,
                              enabled: true,
                              chromeLayers: {
                                ...p.chromeLayers,
                                heroWelcome: {
                                  ...(p.chromeLayers?.heroWelcome ??
                                    DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS),
                                  [layer]: !on,
                                },
                              },
                            }));
                            setDetailFxSaved(false);
                          }}
                        >
                          {layerLabel}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <p className="text-xs text-base-content/70 text-pretty ps-7">
                  {t(
                    'احفظ أيضاً قسم «أجواء الموقع» أسفل الصفحة لتثبيت الطبقات.',
                    'Also save Site atmosphere below to persist these layers.',
                  )}
                </p>
              </div>

              <HeroRange
                label={t('شفافية البطاقة', 'Card opacity')}
                value={heroCardOpacity}
                min={0}
                max={100}
                onChange={(n) => {
                  setHeroCardOpacity(n);
                  setHeroSaved(false);
                }}
                leftHint={t('شفاف', 'Clear')}
                rightHint={t('صلب', 'Solid')}
                ariaLabel={t('شفافية بطاقة الترحيب', 'Welcome card opacity')}
              />

              <div>
                <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                  {t('هالة البطاقة', 'Card aura')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('هالة بطاقة الترحيب', 'Welcome card aura')}>
                  {AURA_STYLES.map((s) => {
                    const on = heroCardAura === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`btn btn-xs border ${focusRing} ${
                          on
                            ? 'border-info/45 bg-info/15 text-info'
                            : 'btn-ghost border-base-300 text-base-content/70'
                        }`}
                        aria-pressed={on}
                        onClick={() => {
                          setHeroCardAura(s.id);
                          setHeroSaved(false);
                        }}
                      >
                        {t(s.labelAr, s.labelEn)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                  {t('شعار البطاقة', 'Card logo')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('موضع شعار البطاقة', 'Welcome card logo placement')}>
                  {(
                    [
                      { id: 'off' as const, ar: 'إخفاء', en: 'Off' },
                      { id: 'above' as const, ar: 'فوق النص', en: 'Above text' },
                      { id: 'behind' as const, ar: 'خلف النص', en: 'Behind text' },
                    ] as const
                  ).map((opt) => {
                    const on = heroLogoPlacement === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`btn btn-xs border ${focusRing} ${
                          on
                            ? 'border-primary/40 bg-primary/10'
                            : 'btn-ghost border-base-300 text-base-content/70'
                        }`}
                        aria-pressed={on}
                        onClick={() => {
                          setHeroLogoPlacement(opt.id);
                          setHeroSaved(false);
                        }}
                      >
                        {t(opt.ar, opt.en)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {heroLogoPlacement !== 'off' ? (
                <label className="flex w-full flex-col gap-1.5">
                  <span className="text-xs font-semibold tracking-wide text-base-content/80">
                    {t('رابط صورة الشعار (اختياري)', 'Logo image URL (optional)')}
                  </span>
                  <input
                    type="url"
                    className="input input-bordered input-sm w-full font-mono text-xs"
                    value={heroLogoUrl}
                    placeholder="https://…"
                    dir="ltr"
                    onChange={(e) => {
                      setHeroLogoUrl(e.target.value.trim());
                      setHeroSaved(false);
                    }}
                    aria-label={t('رابط صورة الشعار', 'Logo image URL')}
                  />
                </label>
              ) : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5 checkbox-primary"
                  checked={heroBottomFade}
                  onChange={(e) => {
                    setHeroBottomFade(e.target.checked);
                    if (!e.target.checked) setHeroBottomFadeAnimate(false);
                    setHeroSaved(false);
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-tight">
                    {t('تدرج أسفل الخلفية', 'Bottom fade')}
                  </span>
                  <span className="block text-xs text-base-content/65 mt-0.5 text-pretty">
                    {t('حجاب قصير يدمج الخلفية بالمحتوى.', 'Short veil blending hero into content.')}
                  </span>
                </span>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3 ${
                  heroBottomFade ? 'cursor-pointer' : 'opacity-45'
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm mt-0.5 checkbox-primary"
                  checked={heroBottomFadeAnimate}
                  disabled={!heroBottomFade}
                  onChange={(e) => {
                    setHeroBottomFadeAnimate(e.target.checked);
                    setHeroSaved(false);
                  }}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-tight">
                    {t('تحريك التدرج', 'Animate fade')}
                  </span>
                  <span className="block text-xs text-base-content/65 mt-0.5 text-pretty">
                    {t('نبض خفيف (يحترم تقليل الحركة).', 'Gentle breathe (honors reduced motion).')}
                  </span>
                </span>
              </label>
            </div>
          </div>
        ) : null}
      </section>

      {/* Product page video player (Plyr) */}
      <section id="builder-player" className={SECTION_SHELL} aria-labelledby="builder-player-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="builder-player-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-warning/40 bg-warning/10 text-warning flex items-center justify-center shrink-0">
                <Clapperboard size={15} aria-hidden />
              </span>
              {t('مشغّل فيديو المنتج', 'Product video player')}
            </h3>
            <p className={SECTION_DESC}>
              {t(
                'Plyr لصفحات المنتجات. عطّله لاستخدام مشغّل المتصفح للملفات فقط.',
                'Plyr on product pages. Turn off to use the browser player for file URLs only.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={savePlyr}
            disabled={!plyrDirty || saveMutation.isPending}
            className={`btn btn-primary btn-sm gap-1.5 self-start ${focusRing}`}
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : plyrSaved && !plyrDirty ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {plyrSaved && !plyrDirty ? t('تم الحفظ', 'Saved') : t('حفظ المشغّل', 'Save player')}
          </button>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100/50 p-3 cursor-pointer">
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary mt-0.5"
            checked={plyrConfig.enabled}
            onChange={(e) => {
              setPlyrConfig((p) => ({ ...p, enabled: e.target.checked }));
              setPlyrSaved(false);
            }}
          />
          <span className="text-sm font-medium">{t('تفعيل Plyr', 'Enable Plyr')}</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium opacity-70">{t('لون التمييز', 'Accent')}</label>
          <input
            type="color"
            className="w-10 h-8 rounded border border-base-300 bg-transparent cursor-pointer"
            value={plyrConfig.accent}
            onChange={(e) => {
              setPlyrConfig((p) => ({ ...p, accent: e.target.value }));
              setPlyrSaved(false);
            }}
          />
          <span className="font-mono text-xs opacity-60">{plyrConfig.accent}</span>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium opacity-70">{t('أزرار التحكم', 'Controls')}</p>
          <div className="flex flex-wrap gap-2">
            {PLYR_CONTROL_OPTIONS.map((id) => (
              <label
                key={id}
                className="label cursor-pointer gap-2 rounded-lg border border-base-300 bg-base-100/50 px-2.5 py-1.5"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs checkbox-primary"
                  checked={plyrConfig.controls.includes(id)}
                  onChange={() => togglePlyrControl(id)}
                />
                <span className="label-text text-xs font-mono">{id}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100/50 p-3 cursor-pointer">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={plyrConfig.seekTooltips}
            onChange={(e) => {
              setPlyrConfig((p) => ({ ...p, seekTooltips: e.target.checked }));
              setPlyrSaved(false);
            }}
          />
          <span className="text-sm">{t('تلميحات التقديم', 'Seek tooltips')}</span>
        </label>
      </section>

      {/* Site atmosphere (grid / particles / game icons) */}
      <section id="builder-atmosphere" className={SECTION_SHELL} aria-labelledby="builder-atmosphere-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 min-w-0">
            <h3 id="builder-atmosphere-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-success/40 bg-success/10 text-success flex items-center justify-center shrink-0">
                <Orbit size={15} aria-hidden />
              </span>
              {t('أجواء الموقع', 'Site atmosphere')}
            </h3>
            <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-base-300 bg-base-100 px-3 py-1.5">
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={detailFx.enabled}
                onChange={(e) => {
                  setDetailFx((p) => ({ ...p, enabled: e.target.checked }));
                  setDetailFxSaved(false);
                }}
              />
              <span className="text-sm font-semibold tracking-tight">
                {detailFx.enabled ? t('مفعّل', 'On') : t('متوقف', 'Off')}
              </span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${focusRing}`}
              onClick={() => {
                setDetailFx({
                  ...DEFAULT_PRODUCT_DETAIL_FX,
                  pages: { ...DEFAULT_ATMOSPHERE_PAGES },
                  pageLayers: defaultAtmospherePageLayers(),
                  logoIds: [...DEFAULT_ATMOSPHERE_LOGO_IDS],
                  customLogos: [],
                });
                setDetailFxSaved(false);
              }}
            >
              {t('إعادة الافتراضي', 'Reset defaults')}
            </button>
            <button
              type="button"
              onClick={saveDetailFx}
              disabled={!detailFxDirty || saveMutation.isPending}
              className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}
            >
              {saveMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : detailFxSaved && !detailFxDirty ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {detailFxSaved && !detailFxDirty
                ? t('تم الحفظ', 'Saved')
                : t('حفظ الأجواء', 'Save atmosphere')}
            </button>
          </div>
        </div>

        {!detailFx.enabled ? (
          <p
            role="status"
            className="text-sm text-warning rounded-lg border border-warning/35 bg-warning/10 px-3 py-2 text-pretty"
          >
            {t('موقوف — فعّل ثم احفظ ليظهر في المتجر.', 'Off — enable, then save to show in the store.')}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('محرّر الأجواء', 'Atmosphere editor')}>
          {(
            [
              { id: 'pages' as const, ar: 'الصفحات', en: 'Pages' },
              { id: 'layers' as const, ar: 'الطبقات', en: 'Layers' },
              { id: 'tune' as const, ar: 'الضبط', en: 'Tune' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={atmosphereTab === tab.id}
              className={`btn btn-xs gap-1 border ${focusRing} ${
                atmosphereTab === tab.id
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              onClick={() => setAtmosphereTab(tab.id)}
            >
              <span className="font-semibold tracking-tight">{t(tab.ar, tab.en)}</span>
            </button>
          ))}
        </div>

        {atmosphereTab === 'pages' ? (
          <div className="space-y-3">
            <p className="text-sm text-base-content/65 text-pretty">
              {t(
                'فعّل صفحة، ثم طبقات الأنماط / الجزيئات / الشعار لها.',
                'Enable a page, then its Patterns / Particles / Logo layers.',
              )}
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(
                [
                  ['home', t('الرئيسية', 'Home')],
                  ['store', t('تصفح المتجر', 'Explore Store')],
                  ['subscriptions', t('الاشتراكات', 'Subscriptions')],
                  ['giftCards', t('بطاقات الهدايا', 'Gift Cards')],
                  ['product', t('صفحة المنتج', 'Product page')],
                  ['seller', t('صفحة البائع', 'Seller page')],
                  ['cart', t('السلة', 'Cart')],
                  ['checkout', t('الدفع', 'Checkout')],
                  ['wishlist', t('المفضلة', 'Wishlist')],
                  ['about', t('عنّا / قانوني', 'About / legal')],
                  ['other', t('أخرى', 'Other')],
                  ['heroWelcome', t('بطاقة الترحيب', 'Welcome card')],
                  ['footer', t('التذييل (شفاف)', 'Footer (see-through)')],
                  ['drawer', t('الدرج (شفاف)', 'Drawer (see-through)')],
                ] as const satisfies ReadonlyArray<readonly [AtmospherePageKey, string]>
              ).map(([key, label]) => {
                const isChrome = key === 'footer' || key === 'drawer' || key === 'heroWelcome';
                const routeKey = key as AtmosphereRouteKey;
                const pageOn = detailFx.pages[key];
                const layers =
                  !isChrome && ATMOSPHERE_ROUTE_KEYS.includes(routeKey)
                    ? (detailFx.pageLayers[routeKey] ?? DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS)
                    : key === 'heroWelcome'
                      ? (detailFx.chromeLayers?.heroWelcome ??
                        DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS)
                      : null;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border px-3 py-2.5 space-y-2 transition-colors ${
                      pageOn
                        ? 'border-success/40 bg-success/5'
                        : 'border-base-300 bg-base-100'
                    } ${isChrome ? 'sm:col-span-2 lg:col-span-3' : ''}`}
                  >
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm checkbox-primary"
                        checked={pageOn}
                        onChange={(e) => {
                          setDetailFx((p) => ({
                            ...p,
                            enabled: true,
                            pages: { ...p.pages, [key]: e.target.checked },
                          }));
                          setDetailFxSaved(false);
                        }}
                      />
                      <span className="text-sm font-semibold tracking-tight">{label}</span>
                    </label>
                    {layers && pageOn ? (
                      <div className="flex flex-wrap gap-1.5 ps-7">
                        {(
                          [
                            ['grid', t('أنماط', 'Patterns'), detailFx.grid],
                            ['particles', t('جزيئات', 'Particles'), detailFx.particles],
                            ['logo', t('شعار', 'Logo'), detailFx.logo],
                          ] as const
                        ).map(([layer, layerLabel, masterOn]) => {
                          const on = layers[layer];
                          return (
                            <button
                              key={layer}
                              type="button"
                              disabled={!masterOn}
                              className={`btn btn-xs border ${focusRing} ${
                                on && masterOn
                                  ? 'border-success/40 bg-success/15 text-success'
                                  : 'btn-ghost border-base-300 text-base-content/65'
                              }`}
                              aria-pressed={on}
                              onClick={() => {
                                if (key === 'heroWelcome') {
                                  setDetailFx((p) => ({
                                    ...p,
                                    enabled: true,
                                    chromeLayers: {
                                      ...p.chromeLayers,
                                      heroWelcome: {
                                        ...(p.chromeLayers?.heroWelcome ??
                                          DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS),
                                        [layer]: !on,
                                      },
                                    },
                                  }));
                                } else {
                                  setDetailFx((p) => ({
                                    ...p,
                                    enabled: true,
                                    pageLayers: {
                                      ...p.pageLayers,
                                      [routeKey]: {
                                        ...(p.pageLayers[routeKey] ??
                                          DEFAULT_ATMOSPHERE_PAGE_LAYERS_FLAGS),
                                        [layer]: !on,
                                      },
                                    },
                                  }));
                                }
                                setDetailFxSaved(false);
                              }}
                            >
                              {layerLabel}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {atmosphereTab === 'layers' ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                [
                  ['grid', t('الأنماط', 'Patterns'), detailFx.grid],
                  ['particles', t('الجزيئات', 'Particles'), detailFx.particles],
                  ['logo', t('شعار اللعبة', 'Game logo'), detailFx.logo],
                ] as const
              ).map(([key, label, on]) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-sm justify-between border gap-2 ${focusRing} ${
                    on
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'btn-ghost border-base-300'
                  }`}
                  aria-pressed={on}
                  onClick={() => {
                    if (key === 'logo') {
                      const next = !on;
                      setDetailFx((p) => ({ ...p, logo: next, enabled: true }));
                      setLogoPickerOpen(next);
                    } else {
                      setDetailFx((p) => ({ ...p, [key]: !on, enabled: true }));
                    }
                    setDetailFxSaved(false);
                  }}
                >
                  <span className="font-semibold tracking-tight">{label}</span>
                  {key === 'logo' ? (
                    <span className="badge badge-ghost badge-sm tabular-nums font-semibold">
                      {detailFx.logoIds.length}
                    </span>
                  ) : on ? (
                    <Check size={14} aria-hidden />
                  ) : null}
                </button>
              ))}
            </div>

            {detailFx.grid ? (
              <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                    {t('أنواع الأنماط', 'Pattern types')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['lines', t('شبكة', 'Lines')],
                        ['dots', t('نقاط', 'Dots')],
                        ['diagonal', t('مائل', 'Diagonal')],
                        ['cross', t('تقاطع', 'Cross')],
                        ['plus', t('صلبان', 'Plus')],
                      ] as const satisfies ReadonlyArray<readonly [AtmospherePatternId, string]>
                    ).map(([id, label]) => {
                      const on = detailFx.patterns.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`btn btn-xs border ${focusRing} ${
                            on
                              ? 'border-success/40 bg-success/15 text-success'
                              : 'btn-ghost border-base-300 text-base-content/70'
                          }`}
                          aria-pressed={on}
                          onClick={() => {
                            setDetailFx((p) => {
                              const next = on
                                ? p.patterns.filter((x) => x !== id)
                                : [...p.patterns, id];
                              return {
                                ...p,
                                enabled: true,
                                grid: true,
                                patterns: clampAtmospherePatterns(
                                  next.length > 0 ? next : ['lines'],
                                ),
                              };
                            });
                            setDetailFxSaved(false);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-base-content/80 mb-2">
                    {t('موضع النمط', 'Pattern position')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ['behind', t('خلف المحتوى', 'Behind content')],
                        ['above', t('فوق كل شيء', 'Above everything')],
                      ] as const
                    ).map(([id, label]) => {
                      const on =
                        id === 'behind'
                          ? detailFx.patternLayer === 'behind'
                          : detailFx.patternLayer !== 'behind';
                      return (
                        <button
                          key={id}
                          type="button"
                          className={`btn btn-xs border ${focusRing} ${
                            on
                              ? 'border-success/40 bg-success/15 text-success'
                              : 'btn-ghost border-base-300 text-base-content/70'
                          }`}
                          aria-pressed={on}
                          onClick={() => {
                            setDetailFx((p) => ({
                              ...p,
                              enabled: true,
                              patternLayer: id,
                            }));
                            setDetailFxSaved(false);
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            {detailFx.logo ? (
              <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold tracking-wide text-base-content/80">
                    {t('شعارات الأجواء', 'Atmosphere logos')}
                  </p>
                  <button
                    type="button"
                    className={`btn btn-ghost btn-xs ${focusRing}`}
                    onClick={() => setLogoPickerOpen((o) => !o)}
                  >
                    {logoPickerOpen ? t('إخفاء القائمة', 'Hide list') : t('إظهار القائمة', 'Show list')}
                  </button>
                </div>

                {logoPickerOpen ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <label className={`btn btn-outline btn-xs gap-1 ${focusRing}`}>
                        {logoUploading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <ImagePlus size={12} />
                        )}
                        {t('رفع شعار', 'Upload logo')}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (file) void uploadAtmosphereLogo(file);
                          }}
                        />
                      </label>
                      <div className="flex flex-1 gap-1 min-w-[12rem]">
                        <input
                          type="url"
                          className="input input-bordered input-xs flex-1 font-mono"
                          placeholder="https://…/logo.png"
                          value={logoEmbedUrl}
                          dir="ltr"
                          onChange={(e) => setLogoEmbedUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              embedAtmosphereLogoUrl();
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={`btn btn-xs btn-primary ${focusRing}`}
                          onClick={embedAtmosphereLogoUrl}
                        >
                          {t('إضافة', 'Add')}
                        </button>
                      </div>
                    </div>

                    {detailFx.customLogos.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-base-content/70">
                          {t('شعاراتك', 'Your logos')}
                        </p>
                        <ul className="max-h-40 overflow-y-auto rounded-lg border border-base-300 divide-y divide-base-300">
                          {detailFx.customLogos.map((entry) => {
                            const on = detailFx.logoIds.includes(entry.id);
                            return (
                              <li
                                key={entry.id}
                                className={`flex items-center gap-2 px-2 py-1.5 ${on ? 'bg-success/5' : ''}`}
                              >
                                <label className="flex flex-1 items-center gap-2 cursor-pointer min-w-0">
                                  <input
                                    type="checkbox"
                                    className="checkbox checkbox-xs checkbox-primary"
                                    checked={on}
                                    onChange={() => {
                                      setDetailFx((p) => {
                                        const next = on
                                          ? p.logoIds.filter((id) => id !== entry.id)
                                          : [...p.logoIds, entry.id];
                                        const fallback =
                                          p.customLogos.length > 0
                                            ? p.customLogos.map((c) => c.id)
                                            : [...DEFAULT_ATMOSPHERE_LOGO_IDS];
                                        return {
                                          ...p,
                                          enabled: true,
                                          logo: true,
                                          logoIds: next.length > 0 ? next : fallback,
                                        };
                                      });
                                      setDetailFxSaved(false);
                                    }}
                                  />
                                  <img
                                    src={entry.src}
                                    alt=""
                                    className={`w-5 h-5 object-contain ${atmosphereLogoToneClass(entry)}`}
                                  />
                                  <span className="text-sm truncate">
                                    {t(entry.labelAr, entry.labelEn)}
                                  </span>
                                </label>
                                <button
                                  type="button"
                                  className={`btn btn-ghost btn-xs text-error ${focusRing}`}
                                  aria-label={t('حذف', 'Remove')}
                                  onClick={() => {
                                    setDetailFx((p) => {
                                      const customLogos = p.customLogos.filter((c) => c.id !== entry.id);
                                      const logoIds = p.logoIds.filter((id) => id !== entry.id);
                                      const fallback =
                                        customLogos.length > 0
                                          ? customLogos.map((c) => c.id)
                                          : [...DEFAULT_ATMOSPHERE_LOGO_IDS];
                                      return {
                                        ...p,
                                        customLogos,
                                        logoIds: logoIds.length > 0 ? logoIds : fallback,
                                      };
                                    });
                                    setDetailFxSaved(false);
                                  }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-base-content/70">
                        {t('أيقونات هندسية', 'Stylized icons')}
                      </p>
                      <ul className="max-h-48 overflow-y-auto rounded-lg border border-base-300 divide-y divide-base-300">
                        {ATMOSPHERE_LOGO_CATALOG.map((entry) => {
                          const on = detailFx.logoIds.includes(entry.id);
                          return (
                            <li key={entry.id}>
                              <label
                                className={`flex items-center gap-2 px-2 py-1.5 cursor-pointer ${
                                  on ? 'bg-success/5' : 'hover:bg-base-200/70'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-xs checkbox-primary"
                                  checked={on}
                                  onChange={() => {
                                    setDetailFx((p) => {
                                      const next = on
                                        ? p.logoIds.filter((id) => id !== entry.id)
                                        : [...p.logoIds, entry.id];
                                      const fallback =
                                        p.customLogos.length > 0
                                          ? p.customLogos.map((c) => c.id)
                                          : [...DEFAULT_ATMOSPHERE_LOGO_IDS];
                                      return {
                                        ...p,
                                        enabled: true,
                                        logo: true,
                                        logoIds: next.length > 0 ? next : fallback,
                                      };
                                    });
                                    setDetailFxSaved(false);
                                  }}
                                />
                                <img
                                  src={entry.src}
                                  alt=""
                                  className={`w-5 h-5 object-contain opacity-80 ${atmosphereLogoToneClass(entry)}`}
                                />
                                <span className="text-sm">{t(entry.labelAr, entry.labelEn)}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-base-content/65">
                    {t(
                      `${detailFx.logoIds.length} شعار مختار — أظهر القائمة للتعديل.`,
                      `${detailFx.logoIds.length} logos selected — show list to edit.`,
                    )}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {atmosphereTab === 'tune' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['gridOpacity', t('شفافية الأنماط', 'Pattern opacity'), 0, 100, !detailFx.grid],
                ['particleOpacity', t('شفافية الجزيئات', 'Particle opacity'), 0, 100, !detailFx.particles],
                ['logoOpacity', t('شفافية الشعار', 'Logo opacity'), 0, 100, !detailFx.logo],
                ['particleCount', t('عدد الجزيئات', 'Particle count'), 8, 64, !detailFx.particles],
                ['logoCount', t('عدد الشعارات', 'Logo count'), 1, 12, !detailFx.logo],
                ['gridSize', t('كثافة الشبكة', 'Pattern density'), 25, 250, !detailFx.grid],
                ['particleSize', t('حجم الجزيئات', 'Particle size'), 25, 250, !detailFx.particles],
                ['logoSize', t('حجم الشعار', 'Logo size'), 25, 250, !detailFx.logo],
                ['particleSpeed', t('سرعة الجزيئات', 'Particle speed'), 25, 250, !detailFx.particles],
                ['logoSpeed', t('سرعة الشعار', 'Logo speed'), 25, 250, !detailFx.logo],
              ] as const
            ).map(([key, label, min, max, disabled]) => (
              <div
                key={key}
                className={`rounded-lg border border-base-300 bg-base-100 p-3 ${
                  disabled ? 'opacity-45' : ''
                }`}
              >
                <label className="flex w-full flex-col gap-1.5">
                  <span className="flex justify-between gap-2 text-xs font-semibold tracking-wide text-base-content/80">
                    <span>{label}</span>
                    <span className="tabular-nums text-base-content/65">
                      {key === 'gridSize'
                        ? t(
                            `${detailFx.gridSize}%`,
                            `${detailFx.gridSize}%`,
                          )
                        : key === 'particleCount' || key === 'logoCount'
                          ? detailFx[key]
                          : `${detailFx[key]}%`}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={key.endsWith('Size') || key.endsWith('Speed') || key === 'gridSize' ? 5 : 1}
                    className="range range-xs range-primary"
                    value={detailFx[key]}
                    disabled={disabled}
                    onChange={(e) => {
                      setDetailFx((p) => ({
                        ...p,
                        [key]: Number(e.target.value),
                        enabled: true,
                      }));
                      setDetailFxSaved(false);
                    }}
                    aria-label={label}
                  />
                </label>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Page sections */}
      <section id="builder-sections" className={SECTION_SHELL} aria-labelledby="builder-sections-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 id="builder-sections-title" className={SECTION_TITLE}>
            <span className="size-8 rounded-lg border border-base-content/25 bg-base-100 text-base-content/80 flex items-center justify-center shrink-0">
              <LayoutList size={15} aria-hidden />
            </span>
            {t('أقسام الصفحات', 'Page sections')}
          </h3>
          <button
            type="button"
            onClick={saveSections}
            disabled={!sectionsDirty || saveMutation.isPending}
            className={`btn btn-primary btn-sm gap-1.5 self-start ${focusRing}`}
          >
            {saveMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : sectionsSaved && !sectionsDirty ? (
              <Check size={14} />
            ) : (
              <Save size={14} />
            )}
            {sectionsSaved && !sectionsDirty
              ? t('تم الحفظ', 'Saved')
              : t('حفظ الأقسام', 'Save sections')}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('محرّر الأقسام', 'Sections editor')}>
          {(
            [
              { id: 'order' as const, ar: 'الترتيب', en: 'Order' },
              { id: 'widgets' as const, ar: 'الودجات', en: 'Widgets' },
              { id: 'site' as const, ar: 'الموقع', en: 'Site' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={sectionsTab === tab.id}
              className={`btn btn-xs gap-1 border ${focusRing} ${
                sectionsTab === tab.id
                  ? 'border-base-content/30 bg-base-100 text-base-content'
                  : 'btn-ghost border-base-300 text-base-content/70'
              }`}
              onClick={() => setSectionsTab(tab.id)}
            >
              <span className="font-semibold tracking-tight">{t(tab.ar, tab.en)}</span>
            </button>
          ))}
        </div>

        {sectionsTab === 'site' ? (
          <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-pointer transition-colors has-[:checked]:border-warning/40 has-[:checked]:bg-warning/5">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={privacyBanner}
            onChange={(e) => {
              setPrivacyBanner(e.target.checked);
              setSectionsSaved(false);
            }}
          />
          <span className="text-start">
            <span className="block text-sm font-semibold tracking-tight">
              {t('رسالة موافقة الخصوصية', 'Privacy consent message')}
            </span>
            <span className="block text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'اعرض بانر قبول/رفض التحليلات. الرفض يوقف Databuddy. إن عطّلت الرسالة يختفي البانر لكن التحليلات تبقى متوقفة حتى يقبل الزائر من التفضيلات.',
                'Show Accept/Decline analytics banner. Decline blocks Databuddy. Turning the message off hides the banner, but analytics stay off until the visitor accepts in prefs.'
              )}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-pointer transition-colors has-[:checked]:border-info/40 has-[:checked]:bg-info/5">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={drawerCatsEnabled}
            onChange={(e) => {
              setDrawerCatsEnabled(e.target.checked);
              setSectionsSaved(false);
            }}
          />
          <span className="text-start">
            <span className="block text-sm font-semibold tracking-tight">
              {t('فئات قائمة الجوال', 'Drawer categories')}
            </span>
            <span className="block text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'اعرض قسم الفئات (مع عنوان Categories) في قائمة الهامبرغر.',
                'Show the Categories section (label + links) in the hamburger drawer.',
              )}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-base-300 bg-base-100 p-3.5 cursor-pointer transition-colors has-[:checked]:border-info/40 has-[:checked]:bg-info/5">
          <input
            type="checkbox"
            className="checkbox checkbox-sm checkbox-primary mt-0.5"
            checked={storeCatTreeExpand}
            onChange={(e) => {
              setStoreCatTreeExpand(e.target.checked);
              setSectionsSaved(false);
            }}
          />
          <span className="text-start">
            <span className="block text-sm font-semibold tracking-tight">
              {t('توسيع تصنيفات المتجر', 'Store category expand')}
            </span>
            <span className="block text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'أزرار التوسيع بجانب شرائح التصنيف في تصفح المتجر. معطّلة افتراضياً — تظهر التصنيفات الرئيسية فقط.',
                'Expand chevrons beside category chips on Explore Store. Off by default — top-level chips only.',
              )}
            </span>
          </span>
        </label>
          </div>
        ) : null}

        {sectionsTab === 'order' ? (
          <div className="space-y-4">
        <SectionEditor
          title={t('الصفحة الرئيسية', 'Homepage')}
          sections={homeSections}
          labels={homeSectionLabels}
          onToggle={(id) => toggleSection(setHomeSections, id)}
          onMove={(i, dir) => moveSection(setHomeSections, i, dir)}
          onRemove={removeHomeSection}
          canRemove={isCategoryProductsSection}
          t={t}
        />
        <SectionEditor
          title={t('تصفح المتجر', 'Explore Store')}
          sections={storeSections}
          labels={storeSectionLabels}
          onToggle={(id) => toggleSection(setStoreSections, id)}
          onMove={(i, dir) => moveSection(setStoreSections, i, dir)}
          onRemove={removeStoreSection}
          canRemove={isCategoryProductsSection}
          t={t}
        />
          </div>
        ) : null}

        {sectionsTab === 'widgets' ? (
          <div className="space-y-4">
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('منتجات مميزة', 'Featured products')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'اختيار وترتيب المنتجات المميزة صار من قائمة المنتجات — زر «ميّز المنتجات!».',
                'Picking and ordering featured products moved to the Products list — use “Feature Products!”.',
              )}
            </p>
          </div>
          <Link to="/dashboard/products?feature=1" className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}>
            <Sparkles size={14} aria-hidden />
            {t('فتح تمييز المنتجات', 'Open feature products')}
          </Link>
        </div>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('أقسام منتجات حسب التصنيف (الرئيسية)', 'Category product sections (Home)')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'يعرض فقط المنتجات المرتبطة مباشرة بهذا التصنيف (بدون الأبناء). مثال: «GTA 5» منفصل عن «GTA 5 Gift Card».',
                'Shows only products assigned directly to that category (not children). Example: “GTA 5” separate from “GTA 5 Gift Card”.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex w-full flex-col gap-1.5 flex-1 min-w-48">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('التصنيف', 'Category')}</span>
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={addCategoryId}
                onChange={(e) => setAddCategoryId(e.target.value)}
              >
                <option value="">{t('اختر تصنيفاً…', 'Pick a category…')}</option>
                {categoryTree
                  .filter((c) => !usedCategorySectionIds.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {indentPrefix(c.level)}
                      {lang === 'ar' ? c.name_ar || c.name : c.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1"
              disabled={
                !addCategoryId ||
                categorySectionCount >= HOME_CATEGORY_SECTIONS_MAX
              }
              onClick={addCategorySection}
            >
              <Plus size={14} />
              {t('إضافة قسم', 'Add section')}
            </button>
          </div>
          {categorySectionCount >= HOME_CATEGORY_SECTIONS_MAX && (
            <p className="text-xs text-warning">
              {t(
                `الحد الأقصى ${HOME_CATEGORY_SECTIONS_MAX} أقسام تصنيف.`,
                `Max ${HOME_CATEGORY_SECTIONS_MAX} category sections.`,
              )}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-info/30 bg-info/5 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('أقسام منتجات حسب التصنيف (تصفح المتجر)', 'Category product sections (Explore Store)')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'تظهر تحت الكتالوج الكامل. «عرض الكل» يفتح /store?category=slug.',
                'Rendered under the full catalog. “View all” opens /store?category=slug.',
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex w-full flex-col gap-1.5 flex-1 min-w-48">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('التصنيف', 'Category')}</span>
              </span>
              <select
                className="select select-bordered select-sm w-full"
                value={addStoreCategoryId}
                onChange={(e) => setAddStoreCategoryId(e.target.value)}
              >
                <option value="">{t('اختر تصنيفاً…', 'Pick a category…')}</option>
                {categoryTree
                  .filter((c) => !usedStoreCategorySectionIds.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {indentPrefix(c.level)}
                      {lang === 'ar' ? c.name_ar || c.name : c.name}
                    </option>
                  ))}
              </select>
            </label>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1"
              disabled={
                !addStoreCategoryId ||
                storeCategorySectionCount >= STORE_CATEGORY_SECTIONS_MAX
              }
              onClick={addStoreCategorySection}
            >
              <Plus size={14} />
              {t('إضافة قسم', 'Add section')}
            </button>
          </div>
          {storeCategorySectionCount >= STORE_CATEGORY_SECTIONS_MAX && (
            <p className="text-xs text-warning">
              {t(
                `الحد الأقصى ${STORE_CATEGORY_SECTIONS_MAX} أقسام تصنيف.`,
                `Max ${STORE_CATEGORY_SECTIONS_MAX} category sections.`,
              )}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h4 className="text-base font-semibold tracking-tight">
                {t('منتجات بانر الإعلانات', 'Ad banner products')}
              </h4>
              <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
                {t(
                  `اختر حتى ${HOME_ADS_MAX} منتجات. فعّل قسم «بانر الإعلانات» أعلاه لإظهاره بين الفئات والمنتجات.`,
                  `Pick up to ${HOME_ADS_MAX} products. Enable “Ad banners” above to show them between Categories and Products.`
                )}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-xs gap-1 self-start"
              onClick={() => setProductsTick((n) => n + 1)}
              disabled={productsLoading}
            >
              <RefreshCw size={12} className={productsLoading ? 'animate-spin' : ''} />
              {t('تحديث القائمة', 'Refresh list')}
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <label className="flex w-full flex-col gap-1.5 w-full max-w-xs">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('هالة البانر', 'Banner aura')}</span>
              </span>
              <select
                className="select select-bordered select-sm"
                value={adsAura}
                onChange={(e) => {
                  setAdsAura(e.target.value as AuraStyle);
                  setSectionsSaved(false);
                }}
                aria-label={t('هالة بانر الإعلانات', 'Ad banner aura')}
              >
                {AURA_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t(s.labelAr, s.labelEn)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex w-full flex-col gap-1.5 w-full max-w-xs">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">
                  {t('ارتفاع البانر', 'Banner height')}
                </span>
              </span>
              <select
                className="select select-bordered select-sm"
                value={adsSize}
                onChange={(e) => {
                  setAdsSize(e.target.value as HomeAdsSize);
                  setSectionsSaved(false);
                }}
                aria-label={t('ارتفاع بانر الإعلانات', 'Ad banner height')}
              >
                {HOME_ADS_SIZES.map((id) => (
                  <option key={id} value={id}>
                    {id === 'sm'
                      ? t('قصير', 'Short')
                      : id === 'md'
                        ? t('متوسط', 'Medium')
                        : id === 'lg'
                          ? t('طويل', 'Tall')
                          : t('أطول', 'Extra tall')}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex w-full flex-col gap-1.5 w-full max-w-xs grow">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80 font-medium">
                  {t('ثواني بين الشرائح', 'Seconds between slides')}
                </span>
                <span className="text-xs tabular-nums text-base-content/55">
                  {adsIntervalSec}s
                </span>
              </div>
              <input
                type="range"
                min={HOME_ADS_INTERVAL_MIN}
                max={HOME_ADS_INTERVAL_MAX}
                step={1}
                value={adsIntervalSec}
                onChange={(e) => {
                  setAdsIntervalSec(Number(e.target.value));
                  setSectionsSaved(false);
                }}
                className="range range-primary range-xs"
                aria-label={t('ثواني بين شرائح البانر', 'Ad banner slide interval')}
              />
              <div className="flex justify-between text-xs text-base-content/55 px-0.5 mt-0.5">
                <span>{HOME_ADS_INTERVAL_MIN}s</span>
                <span>{HOME_ADS_INTERVAL_MAX}s</span>
              </div>
            </label>
          </div>

          <label className="flex items-center justify-between gap-3 cursor-pointer rounded-lg border border-base-300/70 bg-base-200/40 px-3 py-2.5">
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight">
                {t('لمعة التحويم', 'Glare hover')}
              </span>
              <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                {t(
                  'لمعة معدنية تمر على البانر عند التحويم.',
                  'Metallic glare sweeps across the banner on hover.',
                )}
              </span>
            </span>
            <input
              type="checkbox"
              className="toggle toggle-primary shrink-0"
              checked={adsGlareHover}
              onChange={(e) => {
                setAdsGlareHover(e.target.checked);
                setSectionsSaved(false);
              }}
              aria-label={t('تفعيل لمعة التحويم', 'Enable glare hover')}
            />
          </label>

          <label className="flex w-full flex-col gap-1.5 rounded-lg border border-base-300/70 bg-base-200/40 px-3 py-2.5">
            <span className="text-sm font-semibold tracking-tight">
              {t('حركة بطاقات المنتجات', 'Product card motion')}
            </span>
            <span className="text-xs text-base-content/60 text-pretty">
              {t(
                'الهالة والتأثيرات وإمالة البطاقة. «تلقائي» يحترم إعداد الجهاز لتقليل الحركة. «دائماً» يبقيها إن كان جهازك يفرض التقليل بالخطأ. الأسعار والأزرار تبقى ظاهرة.',
                'Aura, card effects, and tilt. Auto follows the device reduce-motion setting. Always keeps motion if your device forces that setting by mistake. Prices and buttons stay visible.',
              )}
            </span>
            <select
              className="select select-bordered select-sm w-full max-w-xs"
              value={merchMotionMode}
              onChange={(e) => {
                setMerchMotionMode(parseMerchMotionMode(e.target.value));
                setSectionsSaved(false);
              }}
              aria-label={t('حركة بطاقات المنتجات', 'Product card motion')}
            >
              {MERCH_MOTION_MODES.map((id) => (
                <option key={id} value={id}>
                  {id === 'auto'
                    ? t('تلقائي (اتبع الجهاز)', 'Auto (follow device)')
                    : id === 'always'
                      ? t('دائماً (أبقِ الحركة)', 'Always (keep motion)')
                      : t('إيقاف (تهدئة)', 'Off (calm)')}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-lg border border-base-300/70 bg-base-200/40 p-3 space-y-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="min-w-0">
                <span className="block text-sm font-semibold tracking-tight">
                  {t('شرائط الحافة', 'Blade edge strips')}
                </span>
                <span className="block text-xs text-base-content/60 mt-0.5 text-pretty">
                  {t(
                    'شريط متحرك أعلى وأسفل بانر الإعلانات.',
                    'Scrolling strip along the top and bottom of the ad banner.',
                  )}
                </span>
              </span>
              <input
                type="checkbox"
                className="toggle toggle-primary shrink-0"
                checked={adsBladeEnabled}
                onChange={(e) => {
                  setAdsBladeEnabled(e.target.checked);
                  setSectionsSaved(false);
                }}
                aria-label={t('تفعيل شرائط الحافة', 'Enable blade edge strips')}
              />
            </label>
            {adsBladeEnabled ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('النص (إنجليزي)', 'Text (English)')}
                    </span>
                    <input
                      type="text"
                      className="input input-bordered input-sm"
                      value={adsBladeTextEn}
                      maxLength={HOME_ADS_BLADE_TEXT_MAX}
                      onChange={(e) => {
                        setAdsBladeTextEn(e.target.value.slice(0, HOME_ADS_BLADE_TEXT_MAX));
                        setSectionsSaved(false);
                      }}
                      placeholder={HOME_ADS_BLADE_TEXT_EN_DEFAULT}
                      dir="ltr"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('النص (عربي)', 'Text (Arabic)')}
                    </span>
                    <input
                      type="text"
                      className="input input-bordered input-sm"
                      value={adsBladeTextAr}
                      maxLength={HOME_ADS_BLADE_TEXT_MAX}
                      onChange={(e) => {
                        setAdsBladeTextAr(e.target.value.slice(0, HOME_ADS_BLADE_TEXT_MAX));
                        setSectionsSaved(false);
                      }}
                      placeholder={HOME_ADS_BLADE_TEXT_AR_DEFAULT}
                      dir="rtl"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('الحجم', 'Size')}
                    </span>
                    <select
                      className="select select-bordered select-sm"
                      value={adsBladeSize}
                      onChange={(e) => {
                        setAdsBladeSize(parseHomeAdsBladeSize(e.target.value));
                        setSectionsSaved(false);
                      }}
                    >
                      {HOME_ADS_BLADE_SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s === 'sm'
                            ? t('رفيع', 'Thin')
                            : s === 'lg'
                              ? t('سميك', 'Thick')
                              : t('متوسط', 'Medium')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('اللون', 'Color')}
                    </span>
                    <input
                      type="color"
                      className="h-9 w-full cursor-pointer rounded-lg border border-base-300 bg-base-100 p-1"
                      value={adsBladeColor}
                      onChange={(e) => {
                        setAdsBladeColor(parseHomeAdsBladeColor(e.target.value));
                        setSectionsSaved(false);
                      }}
                      aria-label={t('لون شريط الحافة', 'Blade strip color')}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-base-content/80">
                      {t('الشفافية', 'Opacity')} {adsBladeOpacity}%
                    </span>
                    <input
                      type="range"
                      className="range range-primary range-xs mt-2"
                      min={20}
                      max={100}
                      step={1}
                      value={adsBladeOpacity}
                      onChange={(e) => {
                        setAdsBladeOpacity(parseHomeAdsBladeOpacity(e.target.value));
                        setSectionsSaved(false);
                      }}
                      aria-label={t('شفافية شريط الحافة', 'Blade strip opacity')}
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {adsProductIds.length > 0 && (
            <ul className="space-y-1.5">
              {adsProductIds.map((id, i) => {
                const p = products.find((row) => row.id === id);
                const label = p
                  ? lang === 'ar'
                    ? p.name_ar || p.name
                    : p.name
                  : id.slice(0, 8);
                return (
                  <li
                    key={id}
                    className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/60 px-2 py-1.5"
                  >
                    {p?.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-base-300 shrink-0" />
                    )}
                    <span className="flex-1 text-sm truncate">{label}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      disabled={i === 0}
                      aria-label={t('أعلى', 'Move up')}
                      onClick={() => {
                        setAdsProductIds((prev) => {
                          const next = [...prev];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          return next;
                        });
                        setSectionsSaved(false);
                      }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square"
                      disabled={i === adsProductIds.length - 1}
                      aria-label={t('أسفل', 'Move down')}
                      onClick={() => {
                        setAdsProductIds((prev) => {
                          const next = [...prev];
                          [next[i], next[i + 1]] = [next[i + 1], next[i]];
                          return next;
                        });
                        setSectionsSaved(false);
                      }}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square text-error"
                      aria-label={t('إزالة', 'Remove')}
                      onClick={() => {
                        setAdsProductIds((prev) => prev.filter((x) => x !== id));
                        setSectionsSaved(false);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <label className="input input-bordered input-sm flex items-center gap-2">
            <Search size={14} className="opacity-40 shrink-0" />
            <input
              type="search"
              className="grow bg-transparent"
              placeholder={t('ابحث عن منتج…', 'Search products…')}
              value={adsSearch}
              onChange={(e) => setAdsSearch(e.target.value)}
              aria-label={t('بحث منتجات الإعلان', 'Search ad products')}
            />
          </label>

          <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-base-300 p-2">
            {(() => {
              const q = adsSearch.trim().toLowerCase();
              const active = products.filter((p) => p.status === 'active');
              const list = active.filter((p) => {
                if (!q) return true;
                return (
                  p.name.toLowerCase().includes(q) ||
                  (p.name_ar || '').toLowerCase().includes(q)
                );
              });
              if (productsLoading) {
                return (
                  <p className="text-xs opacity-50 py-2 text-center">{t('جارٍ التحميل…', 'Loading…')}</p>
                );
              }
              if (active.length === 0) {
                return (
                  <p className="text-xs opacity-50 py-2 text-center">
                    {t('لا توجد منتجات نشطة — انشر منتجاً ثم حدّث القائمة.', 'No active products — publish one, then refresh the list.')}
                  </p>
                );
              }
              if (list.length === 0) {
                return (
                  <p className="text-xs opacity-50 py-2 text-center">
                    {t('لا نتائج لهذا البحث', 'No matches for this search')}
                  </p>
                );
              }
              return list.map((p) => {
                const selected = adsProductIds.includes(p.id);
                const full = adsProductIds.length >= HOME_ADS_MAX && !selected;
                const label = lang === 'ar' ? p.name_ar || p.name : p.name;
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-base-300/40 ${
                      full ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={selected}
                      disabled={full}
                      onChange={() => {
                        setAdsProductIds((prev) => {
                          if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                          if (prev.length >= HOME_ADS_MAX) return prev;
                          return [...prev, p.id];
                        });
                        setSectionsSaved(false);
                      }}
                    />
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                    ) : (
                      <Box size={14} className="opacity-40 shrink-0" />
                    )}
                    <span className="text-sm truncate flex-1">{label}</span>
                    <span className="text-xs tabular-nums opacity-50">${p.price}</span>
                  </label>
                );
              });
            })()}
          </div>
        </div>
        <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
          <div>
            <h4 className="text-base font-semibold tracking-tight">
              {t('بطاقات تفاعلية', 'Hover cards')}
            </h4>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                `حتى ${HOME_HOVER_CARDS_MAX} بطاقات تحت المنتجات. فعّل قسم «بطاقات تفاعلية» أعلاه.`,
                `Up to ${HOME_HOVER_CARDS_MAX} cards under Products. Enable “Hover cards” above.`
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-full flex-col gap-1.5 w-28">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('العدد', 'Count')}</span>
              </span>
              <input
                type="number"
                min={1}
                max={HOME_HOVER_CARDS_MAX}
                className="input input-bordered input-sm"
                value={hoverCount}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  setHoverCount(Math.min(HOME_HOVER_CARDS_MAX, Math.max(1, Math.round(n))));
                  setSectionsSaved(false);
                }}
              />
            </label>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-xs opacity-70 px-0.5">{t('مصدر المنتجات', 'Product source')}</legend>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="hover-mode"
                  className="radio radio-sm radio-primary"
                  checked={hoverMode === 'auto'}
                  onChange={() => {
                    setHoverMode('auto');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار عشوائي تلقائي', 'Auto random picker')}
                </span>
              </label>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="hover-mode"
                  className="radio radio-sm radio-primary"
                  checked={hoverMode === 'manual'}
                  onChange={() => {
                    setHoverMode('manual');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار يدوي من المالك', 'Owner-chosen products')}
                </span>
              </label>
            </fieldset>
          </div>

          {hoverMode === 'manual' && (
            <>
              {hoverProductIds.length > 0 && (
                <ul className="space-y-1.5">
                  {hoverProductIds.map((id, i) => {
                    const p = products.find((row) => row.id === id);
                    const label = p
                      ? lang === 'ar'
                        ? p.name_ar || p.name
                        : p.name
                      : id.slice(0, 8);
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/60 px-2 py-1.5"
                      >
                        {p?.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-base-300 shrink-0" />
                        )}
                        <span className="flex-1 text-sm truncate">{label}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          disabled={i === 0}
                          aria-label={t('أعلى', 'Move up')}
                          onClick={() => {
                            setHoverProductIds((prev) => {
                              const next = [...prev];
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          disabled={i === hoverProductIds.length - 1}
                          aria-label={t('أسفل', 'Move down')}
                          onClick={() => {
                            setHoverProductIds((prev) => {
                              const next = [...prev];
                              [next[i], next[i + 1]] = [next[i + 1], next[i]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square text-error"
                          aria-label={t('إزالة', 'Remove')}
                          onClick={() => {
                            setHoverProductIds((prev) => prev.filter((x) => x !== id));
                            setSectionsSaved(false);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <label className="input input-bordered input-sm flex items-center gap-2">
                <Search size={14} className="opacity-40 shrink-0" />
                <input
                  type="search"
                  className="grow bg-transparent"
                  placeholder={t('ابحث عن منتج…', 'Search products…')}
                  value={hoverSearch}
                  onChange={(e) => setHoverSearch(e.target.value)}
                />
              </label>
              <div className="max-h-56 overflow-y-auto space-y-1 rounded-lg border border-base-300 p-2">
                {(() => {
                  const q = hoverSearch.trim().toLowerCase();
                  const list = products.filter((p) => {
                    if (p.status !== 'active') return false;
                    if (!q) return true;
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.name_ar || '').toLowerCase().includes(q)
                    );
                  });
                  if (productsLoading) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">{t('جارٍ التحميل…', 'Loading…')}</p>
                    );
                  }
                  if (list.length === 0) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">
                        {t('لا نتائج', 'No matches')}
                      </p>
                    );
                  }
                  return list.map((p) => {
                    const selected = hoverProductIds.includes(p.id);
                    const full = hoverProductIds.length >= HOME_HOVER_CARDS_MAX && !selected;
                    const label = lang === 'ar' ? p.name_ar || p.name : p.name;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-base-300/40 ${
                          full ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={selected}
                          disabled={full}
                          onChange={() => {
                            setHoverProductIds((prev) => {
                              if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                              if (prev.length >= HOME_HOVER_CARDS_MAX) return prev;
                              return [...prev, p.id];
                            });
                            setSectionsSaved(false);
                          }}
                        />
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                        ) : (
                          <Box size={14} className="opacity-40 shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{label}</span>
                        <span className="text-xs tabular-nums opacity-50">${p.price}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border border-base-300 bg-base-100 p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold tracking-tight">
                {t('اعثر على المزيد', 'Find More Products')}
              </h4>
              <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
                {t(
                  `عرض حتى ${PRODUCT_FIND_MORE_MAX} منتجات أسفل صفحة المنتج، مع تدوير سلس.`,
                  `Up to ${PRODUCT_FIND_MORE_MAX} products under the product page, rotating smoothly.`
                )}
              </p>
            </div>
            <label className="label cursor-pointer gap-2 py-0">
              <span className="label-text text-sm">{t('مفعّل', 'Enabled')}</span>
              <input
                type="checkbox"
                className="toggle toggle-primary toggle-sm"
                checked={findMoreEnabled}
                onChange={(e) => {
                  setFindMoreEnabled(e.target.checked);
                  setSectionsSaved(false);
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex w-full flex-col gap-1.5 w-28">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('الخانات', 'Slots')}</span>
              </span>
              <input
                type="number"
                min={1}
                max={PRODUCT_FIND_MORE_MAX}
                className="input input-bordered input-sm"
                value={findMoreSlots}
                disabled={!findMoreEnabled}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  setFindMoreSlots(Math.min(PRODUCT_FIND_MORE_MAX, Math.max(1, Math.round(n))));
                  setSectionsSaved(false);
                }}
              />
            </label>
            <label className="flex w-full flex-col gap-1.5 w-36">
              <span className="label py-1">
                <span className="text-xs font-semibold tracking-wide text-base-content/80">{t('الفترة (ث)', 'Interval (s)')}</span>
              </span>
              <input
                type="number"
                min={PRODUCT_FIND_MORE_INTERVAL_MIN}
                max={PRODUCT_FIND_MORE_INTERVAL_MAX}
                className="input input-bordered input-sm"
                value={findMoreIntervalSec}
                disabled={!findMoreEnabled}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isNaN(n)) return;
                  setFindMoreIntervalSec(
                    Math.min(
                      PRODUCT_FIND_MORE_INTERVAL_MAX,
                      Math.max(PRODUCT_FIND_MORE_INTERVAL_MIN, Math.round(n))
                    )
                  );
                  setSectionsSaved(false);
                }}
              />
            </label>
            <fieldset className="flex flex-col gap-1.5" disabled={!findMoreEnabled}>
              <legend className="text-xs opacity-70 px-0.5">{t('مصدر المنتجات', 'Product source')}</legend>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="find-more-mode"
                  className="radio radio-sm radio-primary"
                  checked={findMoreMode === 'auto'}
                  onChange={() => {
                    setFindMoreMode('auto');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار عشوائي تلقائي', 'Auto random picker')}
                </span>
              </label>
              <label className="label cursor-pointer justify-start gap-2 py-0">
                <input
                  type="radio"
                  name="find-more-mode"
                  className="radio radio-sm radio-primary"
                  checked={findMoreMode === 'manual'}
                  onChange={() => {
                    setFindMoreMode('manual');
                    setSectionsSaved(false);
                  }}
                />
                <span className="label-text text-sm">
                  {t('اختيار يدوي من المالك', 'Owner-chosen products')}
                </span>
              </label>
            </fieldset>
          </div>

          {findMoreEnabled && findMoreMode === 'manual' && (
            <>
              {findMoreProductIds.length > 0 && (
                <ul className="space-y-1.5">
                  {findMoreProductIds.map((id, i) => {
                    const p = products.find((row) => row.id === id);
                    const label = p
                      ? lang === 'ar'
                        ? p.name_ar || p.name
                        : p.name
                      : id.slice(0, 8);
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-2 rounded-lg border border-base-300 bg-base-200/60 px-2 py-1.5"
                      >
                        {p?.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-base-300 shrink-0" />
                        )}
                        <span className="flex-1 text-sm truncate">{label}</span>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          disabled={i === 0}
                          aria-label={t('أعلى', 'Move up')}
                          onClick={() => {
                            setFindMoreProductIds((prev) => {
                              const next = [...prev];
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square"
                          disabled={i === findMoreProductIds.length - 1}
                          aria-label={t('أسفل', 'Move down')}
                          onClick={() => {
                            setFindMoreProductIds((prev) => {
                              const next = [...prev];
                              [next[i], next[i + 1]] = [next[i + 1], next[i]];
                              return next;
                            });
                            setSectionsSaved(false);
                          }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs btn-square text-error"
                          aria-label={t('إزالة', 'Remove')}
                          onClick={() => {
                            setFindMoreProductIds((prev) => prev.filter((x) => x !== id));
                            setSectionsSaved(false);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <label className="input input-bordered input-sm flex items-center gap-2">
                <Search size={14} className="opacity-40 shrink-0" />
                <input
                  type="search"
                  className="grow bg-transparent"
                  placeholder={t('ابحث عن منتج…', 'Search products…')}
                  value={findMoreSearch}
                  onChange={(e) => setFindMoreSearch(e.target.value)}
                  aria-label={t('بحث منتجات المزيد', 'Search find-more products')}
                />
              </label>

              <div className="max-h-72 overflow-y-auto space-y-1 rounded-lg border border-base-300 p-2">
                {(() => {
                  const q = findMoreSearch.trim().toLowerCase();
                  const active = products.filter((p) => p.status === 'active');
                  const list = active.filter((p) => {
                    if (!q) return true;
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.name_ar || '').toLowerCase().includes(q)
                    );
                  });
                  if (productsLoading) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">{t('جارٍ التحميل…', 'Loading…')}</p>
                    );
                  }
                  if (active.length === 0) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">
                        {t('لا توجد منتجات نشطة', 'No active products')}
                      </p>
                    );
                  }
                  if (list.length === 0) {
                    return (
                      <p className="text-xs opacity-50 py-2 text-center">
                        {t('لا نتائج', 'No matches')}
                      </p>
                    );
                  }
                  return list.map((p) => {
                    const selected = findMoreProductIds.includes(p.id);
                    const full = findMoreProductIds.length >= PRODUCT_FIND_MORE_MAX && !selected;
                    const label = lang === 'ar' ? p.name_ar || p.name : p.name;
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover:bg-base-300/40 ${
                          full ? 'opacity-40 pointer-events-none' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="checkbox checkbox-sm checkbox-primary"
                          checked={selected}
                          disabled={full}
                          onChange={() => {
                            setFindMoreProductIds((prev) => {
                              if (prev.includes(p.id)) return prev.filter((x) => x !== p.id);
                              if (prev.length >= PRODUCT_FIND_MORE_MAX) return prev;
                              return [...prev, p.id];
                            });
                            setSectionsSaved(false);
                          }}
                        />
                        {p.thumbnail_url ? (
                          <img src={p.thumbnail_url} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                        ) : (
                          <Box size={14} className="opacity-40 shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{label}</span>
                        <span className="text-xs tabular-nums opacity-50">${p.price}</span>
                      </label>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>
          </div>
        ) : null}
      </section>

      {/* Footer nav columns */}
      <section id="builder-footer" className={SECTION_SHELL} aria-labelledby="builder-footer-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <h3 id="builder-footer-title" className={SECTION_TITLE}>
              <span className="size-8 rounded-lg border border-accent/40 bg-accent/10 text-accent flex items-center justify-center shrink-0">
                <PanelBottom size={15} aria-hidden />
              </span>
              {t('تذييل الموقع', 'Site footer')}
              <span className="badge badge-ghost badge-sm font-semibold tabular-nums">
                {footerNav.length}/{FOOTER_NAV_COLUMNS_MAX}
              </span>
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${focusRing}`}
              onClick={() => {
                setFooterNav(DEFAULT_FOOTER_NAV);
                setFooterSaved(false);
              }}
            >
              {t('افتراضي', 'Defaults')}
            </button>
            <button
              type="button"
              className={`btn btn-outline btn-sm gap-1 ${focusRing}`}
              disabled={footerNav.length >= FOOTER_NAV_COLUMNS_MAX}
              onClick={addFooterColumn}
            >
              <Plus size={14} />
              {t('عمود', 'Column')}
            </button>
            <button
              type="button"
              onClick={saveFooterNav}
              disabled={!footerDirty || saveMutation.isPending}
              className={`btn btn-primary btn-sm gap-1.5 ${focusRing}`}
            >
              {saveMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : footerSaved && !footerDirty ? (
                <Check size={14} />
              ) : (
                <Save size={14} />
              )}
              {footerSaved && !footerDirty
                ? t('تم الحفظ', 'Saved')
                : t('حفظ التذييل', 'Save footer')}
            </button>
          </div>
        </div>

        <p className="text-sm text-base-content/65 text-pretty">
          {t('الشعار والشبكات من ', 'Brand + socials from ')}
          <Link to="/dashboard/settings" className="link link-primary font-medium">
            {t('الإعدادات', 'Settings')}
          </Link>
          .
        </p>

        {footerNav.length === 0 ? (
          <div className="rounded-lg border border-dashed border-base-300 bg-base-100/50 px-6 py-10 text-center space-y-2">
            <PanelBottom size={28} className="mx-auto text-base-content/35" aria-hidden />
            <p className="text-base font-semibold tracking-tight">
              {t('لا أعمدة', 'No columns')}
            </p>
            <p className="text-sm text-base-content/65">
              {t('أضف عموداً أو استعد الافتراضي.', 'Add a column or restore defaults.')}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {footerNav.map((col, colIndex) => (
              <li
                key={col.id}
                className={`footer-col rounded-lg border overflow-hidden transition-colors ${
                  col.enabled
                    ? 'border-accent/35 bg-base-100'
                    : 'border-base-300 bg-base-200/50'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 px-3 py-3 border-b border-base-300 bg-base-200/40">
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-primary"
                      checked={col.enabled}
                      onChange={(e) => patchFooterColumn(col.id, { enabled: e.target.checked })}
                      aria-label={t('تفعيل العمود', 'Enable column')}
                    />
                    <span className="text-xs font-semibold tracking-wide text-base-content/70 tabular-nums">
                      {colIndex + 1}
                    </span>
                  </label>
                  <input
                    className="input input-bordered input-sm flex-1 min-w-[7rem]"
                    value={col.title_ar}
                    onChange={(e) => patchFooterColumn(col.id, { title_ar: e.target.value })}
                    placeholder={t('العنوان عربي', 'Title AR')}
                    dir="rtl"
                    aria-label={t('عنوان العمود عربي', 'Column title Arabic')}
                  />
                  <input
                    className="input input-bordered input-sm flex-1 min-w-[7rem]"
                    value={col.title_en}
                    onChange={(e) => patchFooterColumn(col.id, { title_en: e.target.value })}
                    placeholder={t('العنوان إنجليزي', 'Title EN')}
                    dir="ltr"
                    aria-label={t('عنوان العمود إنجليزي', 'Column title English')}
                  />
                  <div className="flex items-center gap-0.5 ms-auto">
                    <button
                      type="button"
                      className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                      disabled={colIndex === 0}
                      onClick={() => moveFooterColumn(colIndex, -1)}
                      aria-label={t('أعلى', 'Move up')}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                      disabled={colIndex === footerNav.length - 1}
                      onClick={() => moveFooterColumn(colIndex, 1)}
                      aria-label={t('أسفل', 'Move down')}
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                      onClick={() => removeFooterColumn(col.id)}
                      aria-label={t('حذف العمود', 'Remove column')}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  {col.links.length === 0 ? (
                    <p className="text-sm text-base-content/55 px-1 py-2">
                      {t('لا روابط في هذا العمود.', 'No links in this column.')}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {col.links.map((link, linkIndex) => (
                        <li
                          key={`${col.id}-l${linkIndex}`}
                          className="rounded-lg border border-base-300 bg-base-200/30 p-2.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold tracking-wide text-base-content/55 tabular-nums">
                              {t('رابط', 'Link')} {linkIndex + 1}
                            </span>
                            <button
                              type="button"
                              className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                              onClick={() => removeFooterLink(col.id, linkIndex)}
                              aria-label={t('حذف الرابط', 'Remove link')}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <label className="flex flex-col gap-1 min-w-0">
                              <span className="text-xs font-semibold tracking-wide text-base-content/70">
                                AR
                              </span>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={link.label_ar}
                                onChange={(e) =>
                                  patchFooterLink(col.id, linkIndex, { label_ar: e.target.value })
                                }
                                placeholder={t('تسمية', 'Label')}
                                dir="rtl"
                              />
                            </label>
                            <label className="flex flex-col gap-1 min-w-0">
                              <span className="text-xs font-semibold tracking-wide text-base-content/70">
                                EN
                              </span>
                              <input
                                className="input input-bordered input-sm w-full"
                                value={link.label_en}
                                onChange={(e) =>
                                  patchFooterLink(col.id, linkIndex, { label_en: e.target.value })
                                }
                                placeholder={t('تسمية', 'Label')}
                                dir="ltr"
                              />
                            </label>
                            <label className="flex flex-col gap-1 min-w-0">
                              <span className="text-xs font-semibold tracking-wide text-base-content/70">
                                URL
                              </span>
                              <input
                                className="input input-bordered input-sm w-full font-mono text-xs"
                                value={link.href}
                                onChange={(e) =>
                                  patchFooterLink(col.id, linkIndex, { href: e.target.value })
                                }
                                placeholder="/path or https://"
                                dir="ltr"
                              />
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className={`btn btn-outline btn-xs gap-1 ${focusRing}`}
                    disabled={col.links.length >= FOOTER_NAV_LINKS_MAX}
                    onClick={() => addFooterLink(col.id)}
                  >
                    <Plus size={12} />
                    {t('رابط', 'Link')}
                    <span className="tabular-nums opacity-70">
                      {col.links.length}/{FOOTER_NAV_LINKS_MAX}
                    </span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionEditor({
  title,
  sections,
  labels,
  onToggle,
  onMove,
  onRemove,
  canRemove,
  t,
}: {
  title: string;
  sections: PageSection[];
  labels: Record<string, string>;
  onToggle: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove?: (id: string) => void;
  canRemove?: (id: string) => boolean;
  t: (ar: string, en: string) => string;
}) {
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const enabledCount = sections.filter((s) => s.enabled).length;
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-base-300">
        <h4 className="text-base font-semibold tracking-tight text-balance">{title}</h4>
        <span className="badge badge-ghost badge-sm font-semibold tabular-nums">
          {enabledCount}/{sections.length}
        </span>
      </div>
      <ul className="divide-y divide-base-300">
        {sections.map((s, i) => (
          <li
            key={s.id}
            className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
              s.enabled ? 'bg-transparent' : 'bg-base-200/40'
            }`}
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={s.enabled}
              onChange={() => onToggle(s.id)}
              aria-label={labels[s.id] ?? s.id}
            />
            <span
              className={`flex-1 text-sm font-semibold tracking-tight ${
                s.enabled ? '' : 'text-base-content/50 line-through'
              }`}
            >
              {labels[s.id] ?? s.id}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                disabled={i === 0}
                onClick={() => onMove(i, -1)}
                aria-label={t('أعلى', 'Up')}
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                disabled={i === sections.length - 1}
                onClick={() => onMove(i, 1)}
                aria-label={t('أسفل', 'Down')}
              >
                <ChevronDown size={14} />
              </button>
              {onRemove && canRemove?.(s.id) ? (
                <button
                  type="button"
                  className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                  onClick={() => onRemove(s.id)}
                  aria-label={t('حذف', 'Remove')}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
