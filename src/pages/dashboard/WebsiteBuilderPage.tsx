import { useEffect, useMemo, useState } from 'react';
import { useBlocker, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useI18n } from '../../lib/i18n';
import { useAuthStore } from '../../stores/authStore';
import { useSiteSettings, useSaveSiteSettings } from '../../hooks/useSiteSettings';
import { CATEGORY_COLS } from '../../lib/dbCols';
import { isSafeHref } from '../../lib/safeHref';
import ConfirmDialog from '../../components/dashboard/ConfirmDialog';
import { parseSections, DEFAULT_HOME_SECTIONS, DEFAULT_STORE_SECTIONS, parseHeroMedia, parseHeroMediaBlur, parseHeroMediaSoftness, parseHeroCardOpacity, parseHeroCardAura, parseHeroBottomFade, parseHeroBottomFadeAnimate, parseHeroLogoPlacement, parseHeroLogoUrl, parseHeroEnabled, parseHeroBackdropEnabled, parseHomeAdsProductIds, parseHomeAdsAura, parseHomeAdsIntervalSec, parseHomeAdsSize, parseHomeAdsBladeEnabled, parseHomeAdsBladeText, parseHomeAdsBladeSize, parseHomeAdsBladeColor, parseHomeAdsBladeOpacity, parseHomeAdsGlareHover, parseMerchMotionMode, type MerchMotionMode, HOME_ADS_BLADE_TEXT_EN_DEFAULT, HOME_ADS_BLADE_TEXT_AR_DEFAULT, HOME_ADS_BLADE_COLOR_DEFAULT, type HomeAdsSize, type HomeAdsBladeSize, parseHomeHoverCardsCount, parseHomeHoverCardsMode, parseHomeHoverCardsProductIds, parseProductFindMoreEnabled, parseProductFindMoreMode, parseProductFindMoreSlots, parseProductFindMoreIntervalSec, parseProductFindMoreProductIds, parseDrawerCategoriesEnabled, parseStoreCategoryTreeExpand, parsePrivacyConsentBanner, parseFooterNav, parsePlyrConfig, parseProductDetailFx, parseBuilderPresets, DEFAULT_PLYR_CONFIG, BUILDER_PRESETS_MAX, BUILDER_PRESET_KEYS, FOOTER_NAV_COLUMNS_MAX, FOOTER_NAV_LINKS_MAX, HERO_MEDIA_MAX, HERO_ZOOM_DEFAULT, clampHeroPos, clampHeroZoom, categoryProductsSectionId, parseCategoryProductsSectionId, isCategoryProductsSection, HOME_CATEGORY_SECTIONS_MAX, STORE_CATEGORY_SECTIONS_MAX, parseFeaturedProductIds, parseStoreFeaturedMirrorHome, type PageSection, type HeroMediaItem, type HoverCardsMode, type ProductFindMoreMode, type HeroLogoPlacement, type FooterNavColumn, type PlyrSiteConfig, type PlyrControlId, type ProductDetailFxConfig, type BuilderPreset, type BuilderPresetKey } from '../../lib/siteSettings';
import { flattenCategoryTree } from '../../lib/categories';
import { type AuraStyle } from '../../lib/productEffects';
import { ATMOSPHERE_LOGO_IDS } from '../../lib/atmosphereLogos';
import type { Category } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { HERO_ACCEPT, HERO_MAX_BYTES, focusRing, BUILDER_NAV, type BuilderProduct, type HeroEditorTab, type AtmosphereEditorTab, type SectionsEditorTab } from './websiteBuilder/constants';
import { newMediaId, safeExt, kindFromFile, kindFromUrl, normalizeEmbedUrl } from './websiteBuilder/helpers';
import PresetsSection from './websiteBuilder/PresetsSection';
import HeroSection from './websiteBuilder/HeroSection';
import PlayerSection from './websiteBuilder/PlayerSection';
import AtmosphereSection from './websiteBuilder/AtmosphereSection';
import SectionsSection from './websiteBuilder/SectionsSection';
import FooterSection from './websiteBuilder/FooterSection';

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
  const [pendingPreset, setPendingPreset] = useState<BuilderPreset | null>(null);
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

  // Skip placeholder defaults — they flip toggles (e.g. hero on) then snap off.
  // One effect per group so saving one group never wipes unsaved edits in another.
  const settingsReady = !settingsLoading && !settingsPlaceholder;

  useEffect(() => {
    if (!settingsReady) return;
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
    setSectionsSaved(false);
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
    settingsReady,
  ]);

  useEffect(() => {
    if (!settingsReady) return;
    setPlyrConfig(parsePlyrConfig(settings.plyr_json));
    setPlyrSaved(false);
  }, [
    settings.plyr_json,
    settingsReady,
  ]);

  useEffect(() => {
    if (!settingsReady) return;
    setDetailFx(parseProductDetailFx(settings.product_detail_fx_json, ATMOSPHERE_LOGO_IDS));
    setDetailFxSaved(false);
  }, [
    settings.product_detail_fx_json,
    settingsReady,
  ]);

  useEffect(() => {
    if (!settingsReady) return;
    setPresets(parseBuilderPresets(settings.builder_presets));
  }, [
    settings.builder_presets,
    settingsReady,
  ]);

  useEffect(() => {
    if (!settingsReady) return;
    setFooterNav(parseFooterNav(settings.footer_nav));
    setFooterSaved(false);
  }, [
    settings.footer_nav,
    settingsReady,
  ]);

  useEffect(() => {
    if (!settingsReady) return;
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
  }, [
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
    settingsReady,
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

  // ~40 JSON parse+stringify per render otherwise — memoize on inputs.
  const sectionsDirty = useMemo(() =>
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
    storeCatTreeExpand !== parseStoreCategoryTreeExpand(settings.store_category_tree_expand),
    [
      homeSections, storeSections, homeFeaturedIds, storeFeaturedIds,
      storeFeaturedMirror, adsProductIds, adsAura, adsIntervalSec, adsSize,
      adsBladeEnabled, adsBladeTextEn, adsBladeTextAr, adsBladeSize,
      adsBladeColor, adsBladeOpacity, adsGlareHover, merchMotionMode,
      hoverCount, hoverMode, hoverProductIds, findMoreEnabled, findMoreMode,
      findMoreSlots, findMoreIntervalSec, findMoreProductIds, privacyBanner,
      drawerCatsEnabled, storeCatTreeExpand, settings,
    ]);

  const footerDirty = useMemo(() =>
    JSON.stringify(footerNav) !== JSON.stringify(parseFooterNav(settings.footer_nav)),
    [footerNav, settings]);

  const heroDirty = useMemo(() =>
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
    heroBackdropEnabled !== parseHeroBackdropEnabled(settings.hero_backdrop_enabled),
    [
      heroMedia, heroBlur, heroSoftness, heroCardOpacity, heroCardAura,
      heroBottomFade, heroBottomFadeAnimate, heroLogoPlacement, heroLogoUrl,
      heroEnabled, heroBackdropEnabled, settings,
    ]);

  const plyrDirty = useMemo(() =>
    JSON.stringify(plyrConfig) !== JSON.stringify(parsePlyrConfig(settings.plyr_json)),
    [plyrConfig, settings]);

  const detailFxDirty = useMemo(() =>
    JSON.stringify(detailFx) !==
    JSON.stringify(parseProductDetailFx(settings.product_detail_fx_json, ATMOSPHERE_LOGO_IDS)),
    [detailFx, settings]);

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
    if (!user || !sectionsDirty || saveMutation.isPending) return;
    setError('');
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
    } catch (e) {
      setSectionsSaved(false);
      setError(e instanceof Error ? e.message : t('فشل الحفظ', 'Save failed'));
    }
  };

  const saveFooterNav = async () => {
    if (!user || !footerDirty || saveMutation.isPending) return;
    setError('');
    const badLink = footerNav.some((c) => c.links.some((l) => !isSafeHref(l.href)));
    if (badLink) {
      setError(
        t(
          'رابط غير صالح في التذييل — استخدم مسارًا يبدأ بـ / أو https:// أو mailto:',
          'Invalid footer link — use a path starting with /, https://, or mailto:',
        ),
      );
      return;
    }
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
    if (!user || !heroDirty || saveMutation.isPending) return;
    setError('');
    if (heroLogoUrl && !parseHeroLogoUrl(heroLogoUrl)) {
      setError(t('رابط شعار البطاقة غير صالح — استخدم https://', 'Invalid card logo URL — use https://'));
      return;
    }
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
    if (!user || !plyrDirty || saveMutation.isPending) return;
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
    if (!user || !detailFxDirty || saveMutation.isPending) return;
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

  const persistPresets = async (next: BuilderPreset[], msg: string): Promise<boolean> => {
    if (!user) return false;
    setPresetBusy(true);
    setError('');
    try {
      await saveMutation.mutateAsync({
        updates: { builder_presets: JSON.stringify(next) },
        userId: user.id,
      });
      setPresets(next);
      setOkMsg(msg);
      setPresetBusy(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : t('فشل حفظ الإعدادات المسبقة', 'Failed to save presets'));
    }
    setPresetBusy(false);
    return false;
  };

  const saveCurrentAsPreset = async () => {
    if (presets.length >= BUILDER_PRESETS_MAX) {
      setError(t(`الحد الأقصى ${BUILDER_PRESETS_MAX} إعدادات مسبقة`, `Maximum ${BUILDER_PRESETS_MAX} presets`));
      return;
    }
    const name = presetName.trim() || t(`إعداد ${presets.length + 1}`, `Preset ${presets.length + 1}`);
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
    if (await persistPresets(next, t('تم حفظ الإعداد المسبق', 'Preset saved'))) {
      setPresetName('');
      setNewPresetLocked(false);
    }
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

  const applyPreset = (preset: BuilderPreset) => {
    if (!user) return;
    if (builderDirty) {
      setPendingPreset(preset);
      return;
    }
    void doApplyPreset(preset);
  };

  const doApplyPreset = async (preset: BuilderPreset) => {
    if (!user) return;
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
    const okType = HERO_ACCEPT.split(',').includes(file.type);
    if (!okType) {
      setError(t('صيغة غير مدعومة — صورة أو GIF أو MP4', 'Unsupported type — image, GIF, or MP4'));
      return;
    }

    setHeroUploading(true);
    setError('');
    setOkMsg('');
    try {
      const ext = safeExt(file.name, file.type.startsWith('video/') ? 'mp4' : 'jpg');
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
      const ext = safeExt(file.name, 'png');
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
      <PresetsSection {...{ applyPreset, lang, newPresetLocked, presetBusy, presetName, presets,
        removePreset, saveCurrentAsPreset, saveMutation, setNewPresetLocked, setPresetName, t,
        togglePresetLock, updatePreset, }} />

      {/* Hero backdrop media */}
      <HeroSection {...{ detailFx, embedHeroUrl, heroBackdropEnabled, heroBlur, heroBottomFade,
        heroBottomFadeAnimate, heroCardAura, heroCardOpacity, heroDirty, heroEditorTab,
        heroEmbedUrl, heroEnabled, heroFocusId, heroLogoPlacement, heroLogoUrl, heroMedia,
        heroSaved, heroSoftness, heroUploading, heroZoomLinked, moveHeroMedia, removeHeroMedia,
        resetAllHeroMediaPos, resetHeroMediaPos, saveHeroMedia, saveMutation, setDetailFx,
        setDetailFxSaved, setHeroBackdropEnabled, setHeroBlur, setHeroBottomFade,
        setHeroBottomFadeAnimate, setHeroCardAura, setHeroCardOpacity, setHeroEditorTab,
        setHeroEmbedUrl, setHeroEnabled, setHeroFocusId, setHeroLogoPlacement, setHeroLogoUrl,
        setHeroMediaPos, setHeroMediaZoom, setHeroSaved, setHeroSoftness, setHeroZoomLinked, t,
        uploadHeroFile, }} />

      {/* Product page video player (Plyr) */}
      <PlayerSection {...{ plyrConfig, plyrDirty, plyrSaved, saveMutation, savePlyr, setPlyrConfig,
        setPlyrSaved, t, togglePlyrControl, }} />

      {/* Site atmosphere (grid / particles / game icons) */}
      <AtmosphereSection {...{ atmosphereTab, detailFx, detailFxDirty, detailFxSaved,
        embedAtmosphereLogoUrl, logoEmbedUrl, logoPickerOpen, logoUploading, saveDetailFx,
        saveMutation, setAtmosphereTab, setDetailFx, setDetailFxSaved, setLogoEmbedUrl,
        setLogoPickerOpen, t, uploadAtmosphereLogo, }} />

      {/* Page sections */}
      <SectionsSection {...{ addCategoryId, addCategorySection, addStoreCategoryId,
        addStoreCategorySection, adsAura, adsBladeColor, adsBladeEnabled, adsBladeOpacity,
        adsBladeSize, adsBladeTextAr, adsBladeTextEn, adsGlareHover, adsIntervalSec, adsProductIds,
        adsSearch, adsSize, categorySectionCount, categoryTree, drawerCatsEnabled, findMoreEnabled,
        findMoreIntervalSec, findMoreMode, findMoreProductIds, findMoreSearch, findMoreSlots,
        homeSectionLabels, homeSections, hoverCount, hoverMode, hoverProductIds, hoverSearch, lang,
        merchMotionMode, moveSection, privacyBanner, products, productsLoading, removeHomeSection,
        removeStoreSection, saveMutation, saveSections, sectionsDirty, sectionsSaved, sectionsTab,
        setAddCategoryId, setAddStoreCategoryId, setAdsAura, setAdsBladeColor, setAdsBladeEnabled,
        setAdsBladeOpacity, setAdsBladeSize, setAdsBladeTextAr, setAdsBladeTextEn, setAdsGlareHover,
        setAdsIntervalSec, setAdsProductIds, setAdsSearch, setAdsSize, setDrawerCatsEnabled,
        setFindMoreEnabled, setFindMoreIntervalSec, setFindMoreMode, setFindMoreProductIds,
        setFindMoreSearch, setFindMoreSlots, setHomeSections, setHoverCount, setHoverMode,
        setHoverProductIds, setHoverSearch, setMerchMotionMode, setPrivacyBanner, setProductsTick,
        setSectionsSaved, setSectionsTab, setStoreCatTreeExpand, setStoreSections,
        storeCatTreeExpand, storeCategorySectionCount, storeSectionLabels, storeSections, t,
        toggleSection, usedCategorySectionIds, usedStoreCategorySectionIds, }} />

      {/* Footer nav columns */}
      <FooterSection {...{ addFooterColumn, addFooterLink, footerDirty, footerNav, footerSaved,
        moveFooterColumn, patchFooterColumn, patchFooterLink, removeFooterColumn, removeFooterLink,
        saveFooterNav, saveMutation, setFooterNav, setFooterSaved, t, }} />

      <ConfirmDialog
        open={leaveBlocker.state === 'blocked'}
        onClose={() => leaveBlocker.reset?.()}
        onConfirm={() => leaveBlocker.proceed?.()}
        danger
        title={t('تغييرات غير محفوظة', 'Unsaved changes')}
        body={t(
          'لديك تغييرات غير محفوظة. مغادرة الصفحة؟',
          'You have unsaved changes. Leave this page?',
        )}
        confirmLabel={t('مغادرة', 'Leave')}
        cancelLabel={t('البقاء', 'Stay')}
      />
      <ConfirmDialog
        open={!!pendingPreset}
        onClose={() => setPendingPreset(null)}
        onConfirm={async () => {
          const preset = pendingPreset;
          setPendingPreset(null);
          if (preset) await doApplyPreset(preset);
        }}
        busy={presetBusy}
        danger
        title={t('تطبيق الإعداد المسبق؟', 'Apply preset?')}
        body={t(
          'تطبيق الإعداد يستبدل التغييرات غير المحفوظة. متابعة؟',
          'Applying this preset replaces unsaved changes. Continue?',
        )}
        confirmLabel={t('تطبيق', 'Apply')}
        cancelLabel={t('إلغاء', 'Cancel')}
      />
    </div>
  );
}

