import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, ArrowRight, Check, PackageOpen, Pencil, Play, Zap, Shield } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { useProductBySlug } from '../hooks/useCatalog';
import { siteOrigin, usePageMeta } from '../hooks/usePageMeta';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { productOosLabel, productStockTone } from '../lib/productOos';
import { productDeliveryIsInstant, productDeliveryLabel } from '../lib/productDelivery';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { parsePlyrConfig } from '../lib/siteSettings';
import ProductMedia from '../components/ui/ProductMedia';
import ProductVideoPlayer from '../components/ui/ProductVideoPlayer';
import ProfileBadgeStrip from '../components/ui/ProfileBadgeStrip';
import RatingStars from '../components/ui/RatingStars';
import { parseRequirements } from '../lib/productRequirements';
import { effectiveProductRating } from '../lib/productRating';
import {
  filledSlotIndices,
  normalizeVideoEmbeds,
  resolveEmbedLabel,
  resolveSlotUrl,
  type VideoEmbedSlotIndex,
  type VideoEmbedVariant,
} from '../lib/videoEmbeds';
import { UGC_DIR, UGC_TEXT_CLASS, ugcDisplay } from '../lib/bidi';
import { sellerPath } from '../lib/username';
import { canUsePublicProfile } from '../lib/roles';
import type { Role } from '../types';

const PRODUCT_LD_ID = 'heven-product-jsonld';

const FindMoreProducts = lazy(() => import('../components/product/FindMoreProducts'));
const ProductReviews = lazy(() => import('../components/product/ProductReviews'));

const PRODUCT_EDITOR_ROLES: Role[] = ['owner', 'admin'];

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t, lang, contentDir } = useI18n();
  const ar = lang === 'ar';
  const BackIcon = ar ? ArrowRight : ArrowLeft;
  const { data: product, isLoading, isError, refetch } = useProductBySlug(slug);
  const addItem = useCartStore((s) => s.addItem);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const { settings } = useSiteSettings();
  const plyrConfig = useMemo(() => parsePlyrConfig(settings.plyr_json), [settings.plyr_json]);
  const [added, setAdded] = useState(false);
  /** null = show video (if any); else gallery/thumbnail url */
  const [stageUrl, setStageUrl] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(true);
  const [videoSlot, setVideoSlot] = useState<VideoEmbedSlotIndex>(0);
  const [videoVariant, setVideoVariant] = useState<VideoEmbedVariant>('withAds');

  const pendingName = product
    ? ar
      ? product.name_ar || product.name
      : product.name
    : undefined;
  const pendingDesc = product
    ? ar
      ? product.description_ar || product.description
      : product.description
    : undefined;
  usePageMeta({
    title: pendingName ?? t('منتج', 'Product'),
    description: pendingDesc ?? undefined,
    image: product?.thumbnail_url,
  });

  useEffect(() => {
    if (!product) return;
    const origin = siteOrigin();
    const name = ar ? product.name_ar || product.name : product.name;
    const description = (ar ? product.description_ar || product.description : product.description) || undefined;
    const image = product.thumbnail_url
      ? product.thumbnail_url.startsWith('http')
        ? product.thumbnail_url
        : `${origin}${product.thumbnail_url.startsWith('/') ? '' : '/'}${product.thumbnail_url}`
      : undefined;
    const pageUrl = `${origin}/product/${product.slug}`;
    const sellerName =
      product.show_seller_name && product.seller?.full_name?.trim()
        ? product.seller.full_name.trim()
        : undefined;
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      url: pageUrl,
      image: image ? [image] : undefined,
      sku: product.id,
      brand: { '@type': 'Brand', name: 'HEVEN.FUN' },
      offers: {
        '@type': 'Offer',
        url: pageUrl,
        priceCurrency: 'USD',
        price: Number(product.price).toFixed(2),
        availability:
          product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        ...(sellerName
          ? { seller: { '@type': 'Organization', name: sellerName } }
          : {}),
      },
      ...(product.review_count > 0 && product.rating > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.review_count,
            },
          }
        : {}),
    };
    let el = document.getElementById(PRODUCT_LD_ID) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.id = PRODUCT_LD_ID;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => {
      document.getElementById(PRODUCT_LD_ID)?.remove();
    };
  }, [product, ar]);

  const handleAdd = () => {
    if (!product || product.stock <= 0) return;
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  };

  const goBack = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof idx === 'number' && idx > 0) navigate(-1);
    else navigate('/store');
  };

  const videoEmbeds = useMemo(
    () =>
      product
        ? normalizeVideoEmbeds(product.video_embeds, product.video_url)
        : normalizeVideoEmbeds(null, null),
    [product],
  );

  useEffect(() => {
    if (!product) return;
    setVideoSlot(videoEmbeds.defaultSlot);
    setVideoVariant(videoEmbeds.defaultVariant);
    setShowVideo(true);
    setStageUrl(null);
  }, [product, product?.id, videoEmbeds.defaultSlot, videoEmbeds.defaultVariant]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-base-100 pt-20 pb-16" dir={contentDir}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="skeleton aspect-[4/3] rounded-2xl" />
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4" />
            <div className="skeleton h-4 w-1/3" />
            <div className="skeleton h-24 w-full" />
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-base-100 pt-24 flex items-center justify-center px-4" dir={contentDir}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-base-300/60 flex items-center justify-center mx-auto mb-4">
            <PackageOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('تعذّر تحميل المنتج', 'Could not load product')}</h1>
          <p className="text-sm text-base-content/70 mb-6">
            {t('تحقق من اتصالك وحاول مجدداً.', 'Check your connection and try again.')}
          </p>
          <button type="button" className="btn btn-primary" onClick={() => void refetch()}>
            {t('إعادة المحاولة', 'Try again')}
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-base-100 pt-24 flex items-center justify-center px-4" dir={contentDir}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-base-300/60 flex items-center justify-center mx-auto mb-4">
            <PackageOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t('المنتج غير موجود', 'Product not found')}</h1>
          <p className="text-sm text-base-content/70 mb-6">
            {t('ربما تمت إزالته أو أن الرابط غير صحيح.', 'It may have been removed, or the link is wrong.')}
          </p>
          <Link to="/store" className="btn btn-primary gap-2">
            <BackIcon size={16} />
            {t('تصفح المنتجات', 'Browse Products')}
          </Link>
        </div>
      </div>
    );
  }

  const name = ar ? product.name_ar || product.name : product.name;
  const stars = effectiveProductRating(product);
  const description = ar ? product.description_ar || product.description : product.description;
  const requirements = parseRequirements(product.requirements);
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;
  const outOfStock = product.stock <= 0;
  const stockTone = productStockTone(product.stock);
  const deliveryLabel = productDeliveryLabel(t, product, lang);
  const deliveryInstant = productDeliveryIsInstant(product);
  const role = profile?.role;
  const canEditProduct =
    Boolean(role) &&
    (PRODUCT_EDITOR_ROLES.includes(role!) ||
      (role === 'seller' && Boolean(user?.id) && product.seller_id === user?.id));
  const videoSlots = filledSlotIndices(videoEmbeds);
  const hasVideo = product.video_enabled === true && videoSlots.length > 0;
  const activeSlot = videoSlots.includes(videoSlot) ? videoSlot : (videoSlots[0] ?? 0);
  const activeSlotData = videoEmbeds.slots[activeSlot];
  const stageVideoUrl = resolveSlotUrl(activeSlotData, videoVariant);
  const canWithAds = Boolean(activeSlotData.withAds);
  const canWithoutAds = Boolean(activeSlotData.withoutAds);
  const showVariantToggle = canWithAds && canWithoutAds;

  const gallery = product.images?.map((i) => i.url).filter(Boolean) ?? [];
  const strip: string[] = [];
  if (product.thumbnail_url && !gallery.includes(product.thumbnail_url)) {
    strip.push(product.thumbnail_url);
  }
  strip.push(...gallery);

  const stageIsVideo = hasVideo && showVideo && Boolean(stageVideoUrl);
  const stillSrc = stageUrl || product.thumbnail_url || strip[0] || '';
  const sellerPublic =
    Boolean(product.seller) &&
    product.show_seller_name &&
    canUsePublicProfile(product.seller?.role);
  const showSeller = Boolean(product.seller && product.show_seller_name);

  return (
    /* No overflow clip — Blink flattens FindMore / card aura under overflow ≠ visible */
    <div className="relative min-h-screen bg-base-100 pt-20 pb-16" dir={contentDir}>
      <div className="relative z-10 px-4 sm:px-6 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
          <button type="button" onClick={goBack} className="btn btn-ghost btn-md gap-2 -ms-2 text-lg font-medium min-h-11">
            <BackIcon size={20} />
            {t('رجوع', 'Back')}
          </button>
          {canEditProduct && (
            <Link
              to={`/dashboard/products/${product.slug}/edit`}
              state={{ product }}
              className="btn btn-outline btn-sm gap-2 bg-base-100/85"
            >
              <Pencil size={14} />
              {t('تعديل المنتج', 'Edit Product')}
            </Link>
          )}
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-8 lg:gap-12">
          <div className="space-y-3 pdp-media-col">
            <figure className="product-showcase-stage relative rounded-2xl overflow-hidden border border-base-300 bg-base-200 aspect-[4/3]">
              <div
                key={
                  stageIsVideo
                    ? `v:${activeSlot}:${videoVariant}:${stageVideoUrl}`
                    : `i:${stillSrc ?? 'empty'}`
                }
                className="product-showcase-stage__media absolute inset-0"
              >
                {stageIsVideo && stageVideoUrl ? (
                  <ProductVideoPlayer
                    src={stageVideoUrl}
                    poster={product.thumbnail_url}
                    config={plyrConfig}
                    autoplay={product.video_autoplay}
                    volume={product.video_volume}
                    className="absolute inset-0 w-full h-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover [&_.plyr]:h-full [&_.plyr]:w-full"
                  />
                ) : stillSrc ? (
                  <ProductMedia
                    src={stillSrc}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="eager"
                    fetchPriority="high"
                    width={960}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center opacity-30">
                    <PackageOpen size={64} />
                  </div>
                )}
              </div>
            </figure>

            {(hasVideo || strip.length > 0) && (
              <div
                className="product-showcase-thumbs"
                role="listbox"
                aria-label={t('وسائط المنتج', 'Product media')}
              >
                {videoSlots.map((slot) => {
                  const active = stageIsVideo && activeSlot === slot;
                  return (
                    <button
                      type="button"
                      role="option"
                      key={`embed-${slot}`}
                      onClick={() => {
                        setVideoSlot(slot);
                        setShowVideo(true);
                        setStageUrl(null);
                        const s = videoEmbeds.slots[slot];
                        if (videoVariant === 'withAds' && !s.withAds && s.withoutAds) {
                          setVideoVariant('withoutAds');
                        } else if (videoVariant === 'withoutAds' && !s.withoutAds && s.withAds) {
                          setVideoVariant('withAds');
                        }
                      }}
                      aria-label={
                        videoSlots.length > 1
                          ? t(`فيديو ${slot + 1}`, `Video ${slot + 1}`)
                          : t('فيديو', 'Video')
                      }
                      aria-selected={active}
                      className={`product-showcase-thumb product-showcase-thumb--video${
                        active ? ' is-on' : ''
                      }`}
                    >
                      <Play size={22} className="product-showcase-thumb__play" aria-hidden />
                      {videoSlots.length > 1 ? (
                        <span className="product-showcase-thumb__n" aria-hidden>
                          {slot + 1}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
                {strip.map((url, i) => {
                  const active = !stageIsVideo && (stageUrl || product.thumbnail_url) === url;
                  return (
                    <button
                      type="button"
                      role="option"
                      key={url}
                      onClick={() => {
                        setShowVideo(false);
                        setStageUrl(url);
                      }}
                      aria-label={t(`عرض الصورة ${i + 1}`, `View image ${i + 1}`)}
                      aria-selected={active}
                      className={`product-showcase-thumb${active ? ' is-on' : ''}`}
                    >
                      <ProductMedia
                        src={url}
                        alt=""
                        className="product-showcase-thumb__img w-full h-full object-cover"
                        width={192}
                        sizes="96px"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {stageIsVideo && showVariantToggle ? (
              <div
                className="product-showcase-variant"
                role="group"
                aria-labelledby="product-showcase-players-label"
              >
                <p id="product-showcase-players-label" className="product-showcase-variant__title">
                  {resolveEmbedLabel(videoEmbeds, 'title', lang === 'ar' ? 'ar' : 'en')}
                </p>
                <div className="product-showcase-variant__btns">
                  <button
                    type="button"
                    className={`product-showcase-variant__btn${
                      videoVariant === 'withAds' ? ' is-on' : ''
                    }`}
                    aria-pressed={videoVariant === 'withAds'}
                    onClick={() => setVideoVariant('withAds')}
                  >
                    {resolveEmbedLabel(videoEmbeds, 'player1', lang === 'ar' ? 'ar' : 'en')}
                  </button>
                  <button
                    type="button"
                    className={`product-showcase-variant__btn${
                      videoVariant === 'withoutAds' ? ' is-on' : ''
                    }`}
                    aria-pressed={videoVariant === 'withoutAds'}
                    onClick={() => setVideoVariant('withoutAds')}
                  >
                    {resolveEmbedLabel(videoEmbeds, 'player2', lang === 'ar' ? 'ar' : 'en')}
                  </button>
                </div>
              </div>
            ) : null}

            {showSeller && product.seller && (
              sellerPublic ? (
                <Link
                  to={sellerPath(product.seller)}
                  className="pdp-seller flex w-full min-w-0 items-center gap-3.5 rounded-xl border border-base-300 bg-base-200/60 px-4 py-3 hover:border-primary/40 transition-colors -ms-0"
                >
                  {product.seller.avatar_url ? (
                    <div className="avatar shrink-0">
                      <div className="w-12 rounded-full">
                        <img src={product.seller.avatar_url} alt="" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-12 h-12 shrink-0 rounded-full bg-base-300 grid place-items-center text-sm font-semibold leading-none">
                      {(product.seller.full_name || '?').slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-start">
                    <p className="text-xs opacity-55">{t('البائع', 'Seller')}</p>
                    <p className="font-semibold truncate">{product.seller.full_name || t('بائع', 'Seller')}</p>
                    <ProfileBadgeStrip userId={product.seller.id} size={12} className="mt-1.5" />
                  </div>
                </Link>
              ) : (
                <div className="pdp-seller flex w-full min-w-0 items-center gap-3.5 rounded-xl border border-base-300 bg-base-200/60 px-4 py-3 -ms-0">
                  <div className="w-12 h-12 shrink-0 rounded-full bg-base-300 grid place-items-center text-sm font-semibold leading-none">
                    {(product.seller.full_name || '?').slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1 text-start">
                    <p className="text-xs opacity-55">{t('البائع', 'Seller')}</p>
                    <p className="font-semibold truncate">{product.seller.full_name || t('بائع', 'Seller')}</p>
                  </div>
                </div>
              )
            )}

            <Suspense fallback={null}>
              <div className="pdp-reviews">
              <ProductReviews
                productId={product.id}
                productSlug={product.slug}
                userId={user?.id}
                rating={product.rating}
                reviewCount={product.review_count}
              />
              </div>
            </Suspense>
          </div>

          <div className="min-w-0 space-y-6 text-start pdp-info-col">
            <div className="mx-auto w-full max-w-prose space-y-6 lg:mx-0 lg:max-w-none">
              <div className="space-y-3">
                <div className="space-y-2">
                  <h1 className="font-sans text-[clamp(1.875rem,4vw,2.25rem)] font-bold leading-[1.2] tracking-[-0.02em] text-balance break-words [overflow-wrap:anywhere]">
                    {name}
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <RatingStars value={stars} size={14} label={`${stars} / 5`} />
                    <span className="text-xs tabular-nums text-base-content/60 ms-0.5">
                      <span className="font-medium text-base-content/80 me-1">
                        {stars.toFixed(1)}
                      </span>
                      <span>({product.review_count})</span>
                    </span>
                  </div>
                </div>

                <div
                  className="product-price-row flex flex-wrap items-baseline gap-x-2.5 gap-y-1"
                  aria-label={
                    discount > 0 && product.original_price
                      ? t(
                          `${product.price} دولار، كان ${product.original_price}، خصم ${discount}٪`,
                          `$${product.price}, was $${product.original_price}, ${discount}% off`,
                        )
                      : `$${product.price}`
                  }
                >
                  <span
                    key={product.id}
                    className={`product-price-sale text-3xl md:text-4xl font-black tabular-nums tracking-tight leading-none text-base-content${
                      discount > 0 ? ' product-price-sale--deal' : ''
                    }`}
                  >
                    <span className="product-price-currency" aria-hidden>
                      $
                    </span>
                    <span className="product-price-amount">{product.price}</span>
                  </span>
                  {product.original_price != null && product.original_price > product.price && (
                    <span className="product-price-compare text-sm text-base-content/55 line-through tabular-nums leading-none">
                      ${product.original_price}
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="product-price-off text-sm font-bold tabular-nums tracking-tight leading-none text-base-content">
                      -{discount}%
                    </span>
                  )}
                </div>
              </div>

              {description && (
                <p
                  className={`text-base text-base-content/85 leading-relaxed text-pretty whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${UGC_TEXT_CLASS}`}
                  dir={UGC_DIR}
                >
                  {ugcDisplay(description)}
                </p>
              )}

              {requirements.length > 0 && (
                <div className="space-y-3 border-t border-base-300/80 pt-5">
                  <h2 className="font-sans text-xs font-semibold tracking-wide text-base-content/70">
                    {t('المتطلبات', 'Requirements')}
                  </h2>
                  <dl className="space-y-2">
                    {requirements.map((r, i) => (
                      <div
                        key={`${r.label}-${i}`}
                        className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm leading-snug"
                      >
                        <dt className="shrink-0 min-w-[4.5rem] max-w-[40%] font-medium text-base-content/55">
                          {r.label || t('متطلب', 'Requirement')}
                        </dt>
                        <dd className="min-w-0 flex-1 text-base-content/90 break-words [overflow-wrap:anywhere]">
                          {r.value || '—'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>

            {outOfStock ? (
              <button type="button" disabled className="btn btn-disabled w-full" aria-disabled="true">
                {productOosLabel(t, product)}
              </button>
            ) : (
              <div className="space-y-2">
                <button type="button" onClick={handleAdd} className="btn btn-primary w-full gap-2">
                  {added ? <Check size={16} /> : <ShoppingCart size={16} />}
                  {added ? t('تمت الإضافة', 'Added') : t('أضف للسلة', 'Add to Cart')}
                </button>
                {stockTone === 'low' ? (
                  <p
                    className="text-xs font-medium text-warning text-center"
                    aria-label={`${t('يتبقى', 'Only')} ${product.stock} ${t('فقط', 'left')}`}
                  >
                    <span>{t('يتبقى', 'Only')}</span>{' '}
                    <span className="tabular-nums">{product.stock}</span>{' '}
                    <span>{t('فقط', 'left')}</span>
                  </p>
                ) : null}
                <ul className="text-xs text-base-content/70 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <Zap size={14} className="text-success shrink-0 mt-0.5" aria-hidden />
                    <span>
                      {deliveryInstant
                        ? t('تسليم فوري بعد الدفع', 'Instant delivery after payment')
                        : t(`التسليم: ${deliveryLabel}`, `Delivery: ${deliveryLabel}`)}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield size={14} className="text-success shrink-0 mt-0.5" aria-hidden />
                    <span>{t('دفع آمن عبر Polar', 'Secure payment via Polar')}</span>
                  </li>
                  <li>
                    <Link
                      to={user ? '/dashboard/support' : '/auth/login?next=/dashboard/support'}
                      className="link link-hover text-base-content/70"
                    >
                      {t('المساعدة والتواصل', 'Help & support')}
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <Suspense fallback={null}>
          <FindMoreProducts excludeProductId={product.id} />
        </Suspense>
      </div>
    </div>
  );
}
