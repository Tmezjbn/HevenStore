import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, PackageOpen, ShoppingBag } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { heroAuraClass, type AuraStyle } from '../../lib/productEffects';
import { AuraFrame } from '../ui/ElectricBorder';
import {
  homeAdsBladeSizePx,
  homeAdsSizeClass,
  HOME_ADS_BLADE_COLOR_DEFAULT,
  HOME_ADS_BLADE_OPACITY_DEFAULT,
  HOME_ADS_BLADE_SIZE_DEFAULT,
  HOME_ADS_SIZE_DEFAULT,
  type HomeAdsBladeSize,
  type HomeAdsSize,
} from '../../lib/siteSettings';
import ProductMedia from '../ui/ProductMedia';
import type { Product } from '../../types';

const EASE = [0.16, 1, 0.3, 1] as const;

interface ProductAdsBannerProps {
  products: Product[];
  aura?: AuraStyle;
  /** Seconds between auto-advances. */
  intervalSec?: number;
  /** Stage height preset. */
  size?: HomeAdsSize;
  /** Thin scrolling edge strips (owner toggle). */
  bladeEnabled?: boolean;
  bladeText?: string;
  bladeSize?: HomeAdsBladeSize;
  bladeColor?: string;
  bladeOpacity?: number;
  /** React Bits–style glare sweep on hover. */
  glareHover?: boolean;
}

function AdsBlade({
  text,
  edge,
  rtl,
  style,
}: {
  text: string;
  edge: 'top' | 'bottom';
  rtl: boolean;
  style?: CSSProperties;
}) {
  const phrase = text.trim();
  // Short AR needs more units to fill wide stages; twin halves → -50% loop.
  const units = 12;
  // Phrase = isolated unit. Half stays LTR so seam matches EN.
  // (dir=rtl on full half flipped seam → AR looked like it “ended”.)
  const half = (keyPrefix: string) =>
    Array.from({ length: units }, (_, i) => (
      <span
        key={`${keyPrefix}-${i}`}
        className="ads-blade__unit"
        dir={rtl ? 'rtl' : 'ltr'}
        lang={rtl ? 'ar' : 'en'}
      >
        {phrase}
      </span>
    ));
  return (
    <div
      className={`ads-blade ads-blade--${edge}${rtl ? ' is-rtl' : ''}`}
      dir="ltr"
      style={style}
      aria-hidden
    >
      <div className="ads-blade__track">
        <span className="ads-blade__half">{half('a')}</span>
        <span className="ads-blade__half" aria-hidden>
          {half('b')}
        </span>
      </div>
    </div>
  );
}

export default function ProductAdsBanner({
  products,
  aura = 'none',
  intervalSec = 6,
  size = HOME_ADS_SIZE_DEFAULT,
  bladeEnabled = false,
  bladeText = '',
  bladeSize = HOME_ADS_BLADE_SIZE_DEFAULT,
  bladeColor = HOME_ADS_BLADE_COLOR_DEFAULT,
  bladeOpacity = HOME_ADS_BLADE_OPACITY_DEFAULT,
  glareHover = false,
}: ProductAdsBannerProps) {
  const { t, lang } = useI18n();
  const ar = lang === 'ar';
  const [index, setIndex] = useState(0);
  /** +1 = enter from end (slide toward start); -1 = enter from start */
  const [dir, setDir] = useState<1 | -1>(1);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(() => document.hidden);
  // Hover / hidden tab pause — autoplay resumes when pointer leaves / tab visible.
  // Storefront merch ignores OS reduced-motion (Cursor often forces the flag).
  const paused = hoverPaused || tabHidden;

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  const auraWrap = heroAuraClass(aura);
  const intervalMs = Math.max(1, intervalSec) * 1000;
  const stageClass = homeAdsSizeClass(size);

  const count = products.length;
  const product = products[index] ?? products[0];

  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => {
      setDir(1);
      setIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [count, paused, intervalMs]);

  if (!product) return null;

  const name = ar ? product.name_ar || product.name : product.name;
  const go = (nextDir: 1 | -1) => {
    if (count < 2) return;
    setDir(nextDir);
    setIndex((i) => (i + nextDir + count) % count);
  };

  const slide = {
    enter: (d: number) => ({ x: d > 0 ? '12%' : '-12%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-10%' : '10%', opacity: 0 }),
  };

  const liveLabel = t(
    `${name}، شريحة ${index + 1} من ${count}`,
    `${name}, slide ${index + 1} of ${count}`,
  );

  const showBlade = bladeEnabled && bladeText.trim().length > 0;
  const bladeStyle = {
    '--ads-blade-h': `${homeAdsBladeSizePx(bladeSize)}px`,
    '--ads-blade-bg': bladeColor,
    '--ads-blade-opacity': String(bladeOpacity / 100),
  } as CSSProperties;

  return (
    <AuraFrame className={`ads-banner-aura w-full block ${auraWrap || ''}`.trim()}>
      <div
        className={`group relative w-full overflow-hidden rounded-2xl bg-base-200 ${stageClass}${
          auraWrap ? '' : ' border border-base-300'
        }${showBlade ? ' has-ads-blade' : ''}${glareHover ? ' ads-banner-glare' : ''}`}
        role="region"
        aria-roledescription="carousel"
        aria-label={t('إعلانات المنتجات', 'Product ads')}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
        onFocusCapture={() => setHoverPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHoverPaused(false);
        }}
      >
        <p className="sr-only" aria-live="polite">
          {liveLabel}
        </p>
        {showBlade ? (
          <p className="sr-only">{bladeText.trim()}</p>
        ) : null}
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={product.id}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.55, ease: EASE }}
            className="absolute inset-0"
          >
            <Link
              to={`/product/${product.slug}`}
              className="absolute inset-0 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={name}
            >
              {product.ad_banner_url || product.thumbnail_url ? (
                <ProductMedia
                  src={product.ad_banner_url || product.thumbnail_url || ''}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  width={1600}
                  sizes="100vw"
                  loading="eager"
                  fetchPriority="high"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-base-300/80 text-base-content/40">
                  <PackageOpen size={40} />
                </div>
              )}
              <div className="ads-banner-scrim absolute inset-0" />
              <div
                className={`absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row sm:items-end gap-3${ar ? ' ps-28 sm:ps-40 md:ps-44 sm:justify-end' : ' pe-28 sm:pe-40 md:pe-44 sm:justify-between'}${showBlade ? ' pb-7 sm:pb-8' : ''}`}
              >
                {/* items-center: price sits centered under the name, not edge-aligned alone */}
                <div
                  className="inline-flex flex-col items-center min-w-0 max-w-full"
                  dir={ar ? 'rtl' : 'ltr'}
                >
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-balance tracking-tight truncate text-center max-w-full">
                    {name}
                  </h3>
                  <p className="mt-1 text-lg sm:text-xl font-bold tabular-nums text-center" dir="ltr">
                    ${product.price}
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>

        {showBlade ? (
          <>
            <AdsBlade text={bladeText.trim()} edge="top" rtl={ar} style={bladeStyle} />
            <AdsBlade text={bladeText.trim()} edge="bottom" rtl={ar} style={bladeStyle} />
          </>
        ) : null}

        {/* CTA outside slide — stays put while media/title animate; hover via stage.group */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex p-4 sm:p-6 md:p-8${ar ? ' justify-start' : ' justify-end'}`}
          aria-hidden
        >
          <span className="ads-get-it shrink-0">
            <span className="ads-get-it__outline" />
            <span className="ads-get-it__state">
              <span className="ads-get-it__icon">
                <ShoppingBag size={18} strokeWidth={2.25} aria-hidden />
              </span>
              <p className={ar ? 'ads-get-it__label-ar' : undefined} dir={ar ? 'rtl' : undefined}>
                {ar ? (
                  <span className="ads-get-it__phrase">احصل عليه الآن!</span>
                ) : (
                  Array.from('Get it now!').map((ch, i) => (
                    <span key={i} style={{ ['--i' as string]: i }}>
                      {ch === ' ' ? '\u00A0' : ch}
                    </span>
                  ))
                )}
              </p>
            </span>
          </span>
        </div>

        {count > 1 && (
          <>
            {/* dir=ltr + physical pl/pr — page RTL was packing arrows inward on lang switch. */}
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 z-10" dir="ltr">
              <button
                type="button"
                className="btn btn-circle btn-ghost min-h-11 w-11 bg-base-100/70 hover:bg-base-100"
                aria-label={t('السابق', 'Previous')}
                onClick={() => go(-1)}
              >
                <ChevronLeft size={20} />
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 z-10" dir="ltr">
              <button
                type="button"
                className="btn btn-circle btn-ghost min-h-11 w-11 bg-base-100/70 hover:bg-base-100"
                aria-label={t('التالي', 'Next')}
                onClick={() => go(1)}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            <div
              className={`absolute inset-x-0 flex justify-center gap-0.5 z-10 ${showBlade ? 'bottom-7' : 'bottom-3'}`}
              dir="ltr"
              role="tablist"
              aria-label={t('الشرائح', 'Slides')}
            >
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={t(`شريحة ${i + 1}`, `Slide ${i + 1}`)}
                  className="min-h-11 min-w-11 flex items-center justify-center"
                  onClick={() => {
                    setDir(i > index ? 1 : -1);
                    setIndex(i);
                  }}
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      i === index ? 'w-5 bg-primary' : 'w-1.5 bg-base-content/30'
                    }`}
                    aria-hidden
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </AuraFrame>
  );
}
