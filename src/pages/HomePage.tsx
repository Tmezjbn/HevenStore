import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect, useMemo } from 'react';
import { PackageOpen, LayoutGrid } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useAuthStore } from '../stores/authStore';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useCategories, useFeaturedProducts, useLatestProducts, useProductsByIds } from '../hooks/useCatalog';
import { usePageMeta } from '../hooks/usePageMeta';
import {
  SITE_SETTING_DEFAULTS,
  DEFAULT_HOME_SECTIONS,
  parseSections,
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
  HOME_ADS_BLADE_TEXT_EN_DEFAULT,
  HOME_ADS_BLADE_TEXT_AR_DEFAULT,
  parseHomeHoverCardsCount,
  parseHomeHoverCardsMode,
  parseHomeHoverCardsProductIds,
  parseFeaturedProductIds,
  parseCategoryProductsSectionId,
  preloadHeroMedia,
} from '../lib/siteSettings';
import { heroAuraClass, type AuraStyle } from '../lib/productEffects';
import { AuraFrame } from '../components/ui/ElectricBorder';
import Reveal from '../components/ui/Reveal';
import BrandLogo from '../components/ui/BrandLogo';
import ProductCard from '../components/ui/ProductCard';
import HeroMediaBackdrop from '../components/home/HeroMediaBackdrop';
import HoverMeCards from '../components/home/HoverMeCards';
import CategoryProductsSection from '../components/home/CategoryProductsSection';
import Cta3dLink from '../components/home/Cta3dLink';
import { HeroWelcomeAtmosphere } from '../components/layout/SiteAtmosphere';

// Pulls in framer-motion — loaded async so first paint doesn't ship it.
const ProductAdsBanner = lazy(() => import('../components/home/ProductAdsBanner'));
import type { Product } from '../types';

function pickRandomProducts(pool: Product[], count: number): Product[] {
  if (pool.length <= count) return pool;
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export default function HomePage() {
  const { t, lang, contentDir } = useI18n();
  const { settings, isPlaceholderData } = useSiteSettings();
  usePageMeta({});
  const { data: categories = [] } = useCategories();
  const mainCategories = useMemo(
    () => categories.filter((c) => c.level === 1),
    [categories]
  );
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const homeFeaturedIds = parseFeaturedProductIds(settings.home_featured_product_ids);
  const { data: curatedFeatured = [] } = useProductsByIds(homeFeaturedIds);
  const { data: starredFeatured = [] } = useFeaturedProducts(8);
  const featured = homeFeaturedIds.length > 0 ? curatedFeatured : starredFeatured;
  const { data: latestPool = [], isLoading: latestLoading } = useLatestProducts(48);
  const latest = useMemo(() => latestPool.slice(0, 12), [latestPool]);
  const adsIds = parseHomeAdsProductIds(settings.home_ads_product_ids);
  const { data: adProducts = [] } = useProductsByIds(adsIds);
  const ar = lang === 'ar';
  const adsAura = parseHomeAdsAura(settings.home_ads_aura) as AuraStyle;
  const adsIntervalSec = parseHomeAdsIntervalSec(settings.home_ads_interval_sec);
  const adsSize = parseHomeAdsSize(settings.home_ads_size);
  const adsBladeEnabled = parseHomeAdsBladeEnabled(settings.home_ads_blade_enabled);
  const adsBladeText = parseHomeAdsBladeText(
    ar ? settings.home_ads_blade_text_ar : settings.home_ads_blade_text_en,
    ar ? HOME_ADS_BLADE_TEXT_AR_DEFAULT : HOME_ADS_BLADE_TEXT_EN_DEFAULT,
  );
  const adsBladeSize = parseHomeAdsBladeSize(settings.home_ads_blade_size);
  const adsBladeColor = parseHomeAdsBladeColor(settings.home_ads_blade_color);
  const adsBladeOpacity = parseHomeAdsBladeOpacity(settings.home_ads_blade_opacity);
  const adsGlareHover = parseHomeAdsGlareHover(settings.home_ads_glare_hover);
  const hoverCount = parseHomeHoverCardsCount(settings.home_hover_cards_count);
  const hoverMode = parseHomeHoverCardsMode(settings.home_hover_cards_mode);
  const hoverManualIds = parseHomeHoverCardsProductIds(settings.home_hover_cards_product_ids);
  const { data: hoverManualProducts = [] } = useProductsByIds(
    hoverMode === 'manual' ? hoverManualIds : []
  );
  const hoverProducts = useMemo(() => {
    if (hoverMode === 'manual') return hoverManualProducts.slice(0, hoverCount);
    return pickRandomProducts(latestPool, hoverCount);
  }, [hoverMode, hoverManualProducts, latestPool, hoverCount]);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const canEditProducts =
    profile?.role === 'owner' ||
    profile?.role === 'admin' ||
    profile?.role === 'moderator' ||
    profile?.role === 'seller';

  // Fall back to defaults so the hero never renders blank.
  const pick = (k: keyof typeof SITE_SETTING_DEFAULTS) =>
    settings[k]?.trim() || SITE_SETTING_DEFAULTS[k];

  const hero = {
    eyebrow: ar ? pick('hero_eyebrow_ar') : pick('hero_eyebrow_en'),
    title: ar ? pick('hero_title_ar') : pick('hero_title_en'),
    subtitle: ar ? pick('hero_subtitle_ar') : pick('hero_subtitle_en'),
    desc: ar ? pick('hero_desc_ar') : pick('hero_desc_en'),
  };

  const heroMedia = useMemo(() => parseHeroMedia(settings.hero_media), [settings.hero_media]);
  const heroBlur = parseHeroMediaBlur(settings.hero_media_blur);
  const heroSoftness = parseHeroMediaSoftness(settings.hero_media_softness);
  const heroCardOpacity = parseHeroCardOpacity(settings.hero_card_opacity);
  const heroCardAura = parseHeroCardAura(settings.hero_card_aura) as AuraStyle;
  const heroAuraWrap = heroAuraClass(heroCardAura);
  const hasHeroMedia = heroMedia.length > 0;
  const heroBottomFade = parseHeroBottomFade(settings.hero_bottom_fade);
  const heroBottomFadeAnimate = parseHeroBottomFadeAnimate(settings.hero_bottom_fade_animate);
  const heroLogoPlacement = parseHeroLogoPlacement(settings.hero_logo_placement);
  const heroLogoUrl = parseHeroLogoUrl(settings.hero_logo_url);
  // Defaults are hero_enabled=true — don't paint that until real settings arrive
  // or a disabled card flashes on first visit.
  const settingsReady = !isPlaceholderData;
  const heroEnabled = settingsReady && parseHeroEnabled(settings.hero_enabled);
  const heroBackdropEnabled =
    settingsReady && parseHeroBackdropEnabled(settings.hero_backdrop_enabled);
  const showHeroShell = heroEnabled || heroBackdropEnabled;

  useEffect(() => {
    preloadHeroMedia(heroMedia);
  }, [heroMedia]);

  // Arabic glyphs sit higher on the line, so shift the block up less for AR.
  const heroShift = ar
    ? '-translate-y-16 md:-translate-y-24'
    : '-translate-y-20 md:-translate-y-28';

  // Owner-configured section order + visibility (Dashboard > Settings)
  const sections = parseSections(settings.home_sections, DEFAULT_HOME_SECTIONS);

  return (
    <div className="bg-base-100" dir={contentDir}>
      {/* Hero — card + backdrop independently toggleable */}
      {showHeroShell ? (
      <div className="hero min-h-[100dvh] pt-20 relative overflow-hidden">
        {heroBackdropEnabled ? (
          hasHeroMedia ? (
            <HeroMediaBackdrop items={heroMedia} blur={heroBlur} softness={heroSoftness} />
          ) : (
            <>
              <div className="hero-overlay bg-gradient-to-b from-base-100 via-base-200/40 to-base-100" />
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute inset-x-0 top-1/4 h-64 bg-gradient-to-b from-base-content/10 to-transparent blur-3xl" />
              </div>
            </>
          )
        ) : null}
        {/* Keep welcome card readable over media — keep wash subtle */}
        {heroBackdropEnabled && hasHeroMedia && (
          <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-base-100/12 via-transparent to-transparent" />
        )}

        {/* Short bottom veil: page color up from the floor, fades out quickly */}
        {heroBackdropEnabled && heroBottomFade && (
          <div
            className={`hero-bottom-fade${heroBottomFadeAnimate ? ' hero-bottom-fade--animate' : ''}`}
            aria-hidden
          />
        )}

        {heroEnabled ? (
        <AuraFrame
          className={`hero-welcome ${heroAuraWrap || ''} relative z-10 w-full ${heroShift}`.trim()}
        >
          <div
            className={`hero-welcome-card hero-content hero-frame card rounded-2xl w-full flex-col${
              heroAuraWrap ? '' : ' border border-base-300/40'
            }`}
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-base-100) ${heroCardOpacity}%, transparent)`,
            }}
          >
            <HeroWelcomeAtmosphere />
            {heroLogoPlacement === 'behind' && (
              <div className="hero-welcome-logo hero-welcome-logo--behind" aria-hidden>
                {heroLogoUrl ? (
                  <img src={heroLogoUrl} alt="" className="hero-welcome-logo__img" />
                ) : (
                  <BrandLogo size="xl" link={false} className="hero-welcome-logo__mark" />
                )}
              </div>
            )}
            <div className="card-body items-center text-center p-0 gap-0 relative z-[1]">
              {heroLogoPlacement === 'above' && (
                <div className="hero-welcome-logo hero-welcome-logo--above mb-3 md:mb-4">
                  {heroLogoUrl ? (
                    <img
                      src={heroLogoUrl}
                      alt={pick('site_name') || 'HEVEN.FUN'}
                      className="hero-welcome-logo__img"
                    />
                  ) : (
                    <BrandLogo size="lg" />
                  )}
                </div>
              )}
              {hero.eyebrow && (
                <p className="hero-welcome-eyebrow text-base-content/60 font-semibold mb-2 md:mb-3">
                  {hero.eyebrow}
                </p>
              )}
              <h1 className="hero-welcome-title font-black text-balance tracking-tight">
                <span className="block">{hero.title}</span>
                {hero.subtitle && (
                  <span className="block mt-1.5 md:mt-2 text-base-content/90">
                    {hero.subtitle}
                  </span>
                )}
              </h1>
              {hero.desc && (
                <p className="hero-welcome-desc opacity-70 max-w-md mx-auto mt-3 md:mt-4">
                  {hero.desc}
                </p>
              )}
            </div>
          </div>
        </AuraFrame>
        ) : null}
      </div>
      ) : null}

      {sections.filter((s) => s.enabled).map((section) => {
        if (section.id === 'categories') return (
      <Reveal key="categories" id="categories" as="section" className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">{t('الفئات', 'Categories')}</h2>
        </div>
        {mainCategories.length > 0 ? (
          <div className="home-stagger grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {mainCategories.map((c, i) => {
              const card = (
                <Link
                  to={`/store?category=${encodeURIComponent(c.slug)}`}
                  className="card bg-base-200 border border-base-300 hover:border-primary/40 transition-colors h-full"
                >
                  <div className="card-body items-center text-center gap-2 py-8">
                    {c.image_url ? (
                      <img src={c.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" loading="lazy" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <LayoutGrid size={20} />
                      </div>
                    )}
                    <span className="font-semibold text-sm">{ar ? c.name_ar || c.name : c.name}</span>
                  </div>
                </Link>
              );
              // Outer stagger child keeps home-stagger-in; aura nested so spin isn't replaced.
              return (
                <div key={c.id} style={{ ['--i' as string]: i }}>
                  {c.aura_dual ? (
                    <div className="home-stagger__aura aura aura-dual aura-xs">{card}</div>
                  ) : (
                    card
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="trace-line glow-soft rounded-2xl border border-dashed border-base-300 bg-base-200/40 py-16 px-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-base-300/60 text-base-content flex items-center justify-center mb-4">
              <LayoutGrid size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('لا توجد فئات بعد', 'No categories yet')}</h3>
            <p className="text-sm text-base-content/70 max-w-md mx-auto">
              {t(
                'أضف الفئات من لوحة التحكم لتظهر هنا لزوار المتجر.',
                'Add categories from the dashboard and they will appear here for shoppers.'
              )}
            </p>
          </div>
        )}
      </Reveal>
        );

        if (section.id === 'ads') {
          if (adProducts.length === 0) return null;
          return (
            <Reveal
              key="ads"
              id="ads"
              as="section"
              className="py-6 w-full px-0 sm:px-1 md:px-2 overflow-x-clip"
            >
              <Suspense fallback={null}>
                <ProductAdsBanner
                  products={adProducts}
                  aura={adsAura}
                  intervalSec={adsIntervalSec}
                  size={adsSize}
                  bladeEnabled={adsBladeEnabled}
                  bladeText={adsBladeText}
                  bladeSize={adsBladeSize}
                  bladeColor={adsBladeColor}
                  bladeOpacity={adsBladeOpacity}
                  glareHover={adsGlareHover}
                />
              </Suspense>
            </Reveal>
          );
        }

        // FEATURED PRODUCTS — hand-picked by owner/admins (Dashboard > Products > Feature).
        // Hidden entirely until something is featured.
        if (section.id === 'featured') {
          if (featured.length === 0) return null;
          return (
      <Reveal key="featured" id="featured" as="section" className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold uppercase">{t('منتجات مميزة', 'Featured Products')}</h2>
          <Link to="/store" className="btn btn-ghost btn-sm">
            {t('عرض الكل', 'View all')}
          </Link>
        </div>
        <div className="home-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {featured.map((p, i) => (
            <div key={p.id} style={{ ['--i' as string]: i }}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </Reveal>
          );
        }

        if (section.id === 'products') return (
      <Reveal key="products" id="products" as="section" className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="text-3xl font-bold">{t('المنتجات', 'Products')}</h2>
          {latest.length > 0 && (
            <Link to="/store" className="btn btn-ghost btn-sm">
              {t('عرض الكل', 'View all')}
            </Link>
          )}
        </div>
        {latestLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card bg-base-200 border border-base-300 overflow-hidden">
                <div className="skeleton aspect-[5/4] rounded-none" />
                <div className="card-body gap-2 p-4">
                  <div className="skeleton h-4 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-8 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : latest.length > 0 ? (
          <div className="home-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {latest.map((p, i) => (
              <div key={p.id} style={{ ['--i' as string]: i }}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className="trace-line glow-soft rounded-2xl border border-dashed border-base-300 bg-base-200/40 py-16 px-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-base-300/60 text-base-content flex items-center justify-center mb-4">
              <PackageOpen size={24} />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('لا توجد منتجات بعد', 'No products yet')}</h3>
            <p className="text-sm text-base-content/70 max-w-md mx-auto mb-6">
              {canEditProducts
                ? t(
                    'ستظهر منتجاتك هنا بمجرد إضافتها من لوحة التحكم.',
                    'Your products will appear here once added from the dashboard.',
                  )
                : t(
                    'عد قريباً — نضيف ألعاباً واشتراكات وبطاقات هدايا.',
                    'Check back soon — games, subscriptions, and gift cards are on the way.',
                  )}
            </p>
            {canEditProducts ? (
              <Link to="/dashboard/products" className="btn btn-primary btn-sm">
                {t('إضافة منتجات', 'Add Products')}
              </Link>
            ) : (
              <Link to="/store" className="btn btn-primary btn-sm">
                {t('تصفح المتجر', 'Browse store')}
              </Link>
            )}
          </div>
        )}
      </Reveal>
        );

        {
          const catId = parseCategoryProductsSectionId(section.id);
          if (catId) {
            return (
              <CategoryProductsSection
                key={section.id}
                categoryId={catId}
                category={categoryById.get(catId)}
              />
            );
          }
        }

        if (section.id === 'hover_cards') {
          if (hoverProducts.length === 0) return null;
          return (
            <Reveal
              key="hover_cards"
              id="hover-cards"
              as="section"
              className="py-10 px-4 sm:px-6 max-w-7xl mx-auto"
            >
              <HoverMeCards products={hoverProducts} />
            </Reveal>
          );
        }

        // CTA — only for visitors without an account (smooth 3D tilt card)
        if (section.id === 'cta' && !user) return (
      <Reveal key="cta" id="cta" as="section" className="py-12 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="flex justify-center">
          <Cta3dLink
            to="/auth/register"
            className="my-4 mx-2 cursor-pointer rounded-box outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
          >
            <div className="card cta-3d-card w-96 max-w-[calc(100vw-2rem)]">
              <div className="card-body items-center text-center gap-0 py-12 px-8 sm:py-14 sm:px-10">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-balance text-neutral-content">
                  {t('سجّل حسابك', 'Join us here')}
                </h2>
                <p className="mt-3 text-base text-neutral-content/80 max-w-[22ch] mx-auto text-pretty leading-snug">
                  {t('ابدأ التسوق اليوم', 'Get started!')}
                </p>
                <span className="btn btn-primary btn-wide border-0 pointer-events-none mt-7 min-h-12 text-base font-semibold cta-3d-card__btn">
                  {t('إنشاء حساب مجاني', 'Create Free Account')}
                </span>
              </div>
            </div>
          </Cta3dLink>
        </div>
      </Reveal>
        );

        return null;
      })}
    </div>
  );
}
