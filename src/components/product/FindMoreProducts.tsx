import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { useLatestProducts, useProductsByIds } from '../../hooks/useCatalog';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import {
  parseProductFindMoreEnabled,
  parseProductFindMoreIntervalSec,
  parseProductFindMoreMode,
  parseProductFindMoreProductIds,
  parseProductFindMoreSlots,
  PRODUCT_FIND_MORE_MAX,
} from '../../lib/siteSettings';
import ProductCard from '../ui/ProductCard';
import type { Product } from '../../types';

const EASE = [0.16, 1, 0.3, 1] as const;

function pickRandomProducts(pool: Product[], count: number): Product[] {
  if (count <= 0 || pool.length === 0) return [];
  if (pool.length <= count) return pool;
  const copy = [...pool];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function windowAt(pool: Product[], start: number, slots: number): Product[] {
  if (pool.length === 0) return [];
  const n = Math.min(slots, pool.length);
  return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]!);
}

function slotsGridClass(slots: number): string {
  if (slots <= 1) return 'find-more__grid--1';
  if (slots === 2) return 'find-more__grid--2';
  if (slots === 3) return 'find-more__grid--3';
  return 'find-more__grid--4';
}

interface FindMoreProductsProps {
  excludeProductId: string;
}

export default function FindMoreProducts({ excludeProductId }: FindMoreProductsProps) {
  const { t, lang } = useI18n();
  const ar = lang === 'ar';
  const { settings } = useSiteSettings();
  const enabled = parseProductFindMoreEnabled(settings.product_find_more_enabled);
  const mode = parseProductFindMoreMode(settings.product_find_more_mode);
  const slots = parseProductFindMoreSlots(settings.product_find_more_slots);
  const intervalSec = parseProductFindMoreIntervalSec(settings.product_find_more_interval_sec);
  const manualIds = parseProductFindMoreProductIds(settings.product_find_more_product_ids);

  const { data: allProducts = [] } = useLatestProducts(48);
  const { data: manualProducts = [] } = useProductsByIds(mode === 'manual' ? manualIds : []);

  const autoCandidateKey = useMemo(() => {
    return allProducts
      .filter((p) => p.id !== excludeProductId && p.status === 'active')
      .map((p) => p.id)
      .sort()
      .join(',');
  }, [allProducts, excludeProductId]);

  const pool = useMemo(() => {
    if (!enabled) return [];
    if (mode === 'manual') {
      return manualProducts.filter((p) => p.id !== excludeProductId).slice(0, PRODUCT_FIND_MORE_MAX);
    }
    const candidates = allProducts.filter((p) => p.id !== excludeProductId && p.status === 'active');
    return pickRandomProducts(candidates, PRODUCT_FIND_MORE_MAX);
    // Stable until candidate id set / mode / exclude changes (not every products refetch).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- allProducts gated by autoCandidateKey
  }, [enabled, mode, manualProducts, autoCandidateKey, excludeProductId]);

  const poolKey = pool.map((p) => p.id).join(',');
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  // Storefront merch ignores OS reduced-motion (Cursor often forces the flag).
  const paused = hoverPaused || userPaused;
  const intervalMs = Math.max(1, intervalSec) * 1000;
  const canRotate = pool.length > slots;

  const step = (delta: 1 | -1) => {
    if (!canRotate) return;
    setDir(delta);
    setOffset((o) => (o + delta + pool.length) % pool.length);
  };

  useEffect(() => {
    setOffset(0);
  }, [poolKey]);

  useEffect(() => {
    if (!canRotate || paused) return;
    const id = window.setInterval(() => {
      setDir(1);
      setOffset((o) => (o + 1) % pool.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [canRotate, paused, intervalMs, pool.length]);

  if (!enabled || pool.length === 0) return null;

  const visible = windowAt(pool, offset, slots);
  const stagger = Math.min(0.045, 0.18 / Math.max(visible.length, 1));
  const PrevIcon = ar ? ChevronRight : ChevronLeft;
  const NextIcon = ar ? ChevronLeft : ChevronRight;

  const listVariants = {
    enter: {},
    center: {
      transition: { staggerChildren: stagger, delayChildren: 0.03 },
    },
    exit: {
      transition: { staggerChildren: stagger / 2, staggerDirection: -1 },
    },
  };

  const cardVariants = {
    enter: (d: number) => ({
      x: d > 0 ? 36 : -36,
      opacity: 0,
      y: 8,
    }),
    center: { x: 0, opacity: 1, y: 0 },
    exit: (d: number) => ({
      x: d > 0 ? -28 : 28,
      opacity: 0,
      y: 4,
    }),
  };

  return (
    <section
      className="find-more"
      aria-labelledby="find-more-products-heading"
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
      onFocusCapture={() => setHoverPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHoverPaused(false);
      }}
    >
      <header className="find-more__head">
        <div className="find-more__titles">
          <h2 id="find-more-products-heading" className="find-more__title">
            {t('المزيد!', 'More!')}
          </h2>
          <p className="find-more__lede text-pretty">
            {t('عروض أخرى قد تعجبك قبل ما تكمّل.', 'Other deals worth a look before you go.')}
          </p>
        </div>

        {canRotate ? (
          <div className="find-more__controls">
            <button
              type="button"
              className="find-more__nav"
              aria-label={t('السابق', 'Previous')}
              onClick={() => step(-1)}
            >
              <PrevIcon size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <div
              className="find-more-progress"
              aria-hidden
              title={paused ? t('متوقف مؤقتاً', 'Paused') : undefined}
            >
              <div
                key={offset}
                className={`find-more-progress__bar${paused ? ' is-paused' : ''}`}
                style={{ animationDuration: `${intervalMs}ms` }}
              />
            </div>
            <button
              type="button"
              className="find-more__nav"
              aria-label={t('التالي', 'Next')}
              onClick={() => step(1)}
            >
              <NextIcon size={18} strokeWidth={2.25} aria-hidden />
            </button>
            <button
              type="button"
              className="find-more__pause"
              aria-label={userPaused ? t('تشغيل', 'Play') : t('إيقاف مؤقت', 'Pause')}
              aria-pressed={userPaused}
              onClick={() => setUserPaused((p) => !p)}
            >
              {userPaused ? <Play size={14} aria-hidden /> : <Pause size={14} aria-hidden />}
              <span>{userPaused ? t('تشغيل', 'Play') : t('إيقاف', 'Pause')}</span>
            </button>
          </div>
        ) : null}
      </header>

      <div className="find-more__stage">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div
            key={visible.map((p) => p.id).join('-')}
            custom={dir}
            variants={listVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className={`find-more__grid ${slotsGridClass(Math.min(slots, visible.length))}`}
          >
            {visible.map((p, i) => (
              <motion.div
                key={p.id}
                custom={dir}
                variants={cardVariants}
                transition={{ duration: 0.26, ease: EASE }}
                className="find-more__slot"
                style={{ ['--i' as string]: i }}
              >
                <ProductCard product={p} mediaOnly />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
