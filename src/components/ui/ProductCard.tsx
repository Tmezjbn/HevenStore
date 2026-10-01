import { Link } from 'react-router-dom';
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react';
import { ShoppingCart, PackageOpen, Heart, Check } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { useCartStore } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';
import { auraWrapProps, parseElectricAuraTune } from '../../lib/productEffects';
import { AuraFrame } from './ElectricBorder';
import {
  hover3dLerpIn,
  hover3dLerpOut,
  hover3dMaxTilt,
  parseProductHover3dTune,
} from '../../lib/productHover3d';
import { normalizeCardFx } from '../../lib/productCardFx';
import { productOosLabel, productStockTone } from '../../lib/productOos';
import { effectiveProductRating } from '../../lib/productRating';
import { useMerchMotionCalm } from '../../hooks/useMerchMotionCalm';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { usePointerTilt } from '../../hooks/usePointerTilt';
import ProductMedia from './ProductMedia';
import ProductCardBodyFx from './ProductCardBodyFx';
import UserAvatar from './UserAvatar';
import DiscountBadge from './DiscountBadge';
import RatingStars from './RatingStars';
import { canUsePublicProfile } from '../../lib/roles';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  showAddToCart?: boolean;
  /** Image-led tile (no title / seller / rating / CTA) — e.g. Find More. */
  mediaOnly?: boolean;
}

function ProductCard({
  product,
  showAddToCart = true,
  mediaOnly = false,
}: ProductCardProps) {
  const { t, lang } = useI18n();
  const { settings } = useSiteSettings();
  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const wished = useWishlistStore((s) => s.items.some((p) => p.id === product.id));
  const [justAdded, setJustAdded] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const tiltFaceRef = useRef<HTMLDivElement>(null);
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;
  const name = lang === 'ar' ? product.name_ar || product.name : product.name;
  const stars = effectiveProductRating(product);

  useEffect(() => {
    if (!justAdded) return;
    const id = window.setTimeout(() => setJustAdded(false), 2000);
    return () => window.clearTimeout(id);
  }, [justAdded]);
  const auraWrap = auraWrapProps(product.aura_style, product.aura_color);
  const electricTune = parseElectricAuraTune(product.aura_electric_json);
  const use3d = Boolean(product.hover_3d);
  const hasAura = Boolean(auraWrap.className);
  /** Aura on tilt face so ::before/::after ride the same 3D transform. */
  const auraOnTilt = use3d && hasAura && !mediaOnly;
  const hover3dTune = parseProductHover3dTune(settings.product_hover_3d_json);
  const merchCalm = useMerchMotionCalm();
  usePointerTilt(auraOnTilt ? tiltFaceRef : cardRef, tiltFaceRef, {
    enabled: use3d && !mediaOnly && !merchCalm,
    maxTilt: hover3dMaxTilt(hover3dTune.motion),
    lerpIn: hover3dLerpIn(hover3dTune.speed),
    lerpOut: hover3dLerpOut(hover3dTune.smooth),
  });
  const cardFx = normalizeCardFx(product.card_fx);
  const outOfStock = product.stock <= 0;
  const showSeller = Boolean(product.seller && product.show_seller_name);
  const stockTone = productStockTone(product.stock);
  const lowStockCopy =
    stockTone === 'low'
      ? {
          before: t('يتبقى', 'Only'),
          after: t('فقط', 'left'),
        }
      : null;

  const figure = (
    <figure
      className={`relative aspect-[5/4] ${
        mediaOnly
          ? 'find-more-tile__figure overflow-hidden'
          : 'product-card__figure overflow-hidden'
      }`}
    >
      {mediaOnly ? (
        product.thumbnail_url ? (
          <ProductMedia
            src={product.thumbnail_url}
            alt=""
            className="find-more-tile__media w-full h-full object-cover"
            width={640}
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="find-more-tile__empty w-full h-full flex items-center justify-center">
            <PackageOpen size={28} aria-hidden />
          </div>
        )
      ) : (
        <Link to={`/product/${product.slug}`} className="product-card__media block w-full h-full">
          {product.thumbnail_url ? (
            <ProductMedia
              src={product.thumbnail_url}
              alt={name}
              className="product-card__img w-full h-full object-cover"
              width={640}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="product-card__empty w-full h-full flex items-center justify-center">
              <PackageOpen size={28} aria-hidden />
            </div>
          )}
        </Link>
      )}
      {discount > 0 && (
        <DiscountBadge percent={discount} className="absolute top-2 end-2 z-10" />
      )}
      {!mediaOnly && (
        <button
          type="button"
          onClick={() => toggleWishlist(product)}
          className="product-card__wish"
          aria-label={
            wished
              ? t('إزالة من قائمة المفضلة', 'Remove from wishlist')
              : t('أضف إلى قائمة المفضلة', 'Add to wishlist')
          }
          aria-pressed={wished}
        >
          <Heart size={14} className={wished ? 'text-error fill-error' : undefined} aria-hidden />
        </button>
      )}
    </figure>
  );

  if (mediaOnly) {
    const tile = (
      <Link
        to={`/product/${product.slug}`}
        className="find-more-tile group relative block h-full min-h-0 overflow-hidden rounded-box border border-base-300 bg-base-300"
      >
        {figure}
        <span className="find-more-tile__scrim" aria-hidden />
        <span className="find-more-tile__name">{name}</span>
      </Link>
    );
    if (!auraWrap.className) return tile;
    return (
      <AuraFrame
        className={`product-card-aura ${auraWrap.className} h-full`}
        style={auraWrap.style}
        color={product.aura_color}
        electric={electricTune}
      >
        {tile}
      </AuraFrame>
    );
  }

  const body = (
    <div className="card-body product-card__body">
      <ProductCardBodyFx fx={cardFx} />

      <div className="product-card__heading">
        <Link to={`/product/${product.slug}`} className="product-card__title">
          {name}
        </Link>
        {stockTone === 'low' && lowStockCopy ? (
          <p className="product-card__stock product-card__stock--low">
            <span className="product-card__stock-label">{lowStockCopy.before}</span>
            <span className="product-card__stock-n tabular-nums">{product.stock}</span>
            <span className="product-card__stock-label">{lowStockCopy.after}</span>
          </p>
        ) : null}
      </div>

      <div className="product-card__meta">
        {showSeller && product.seller ? (
          <div className="product-card__seller">
            <UserAvatar
              name={product.seller.full_name}
              avatarUrl={canUsePublicProfile(product.seller.role) ? product.seller.avatar_url : null}
              sizeClass="w-5"
            />
            <span className="product-card__label truncate">
              {product.seller.full_name?.trim() || t('بائع', 'Seller')}
            </span>
          </div>
        ) : null}
        <div className="product-card__rating">
          <RatingStars value={stars} size={18} label={`${stars} / 5`} />
          <span className="product-card__label product-card__rating-n tabular-nums">
            ({Number.isInteger(stars) ? stars : stars.toFixed(1)})
          </span>
        </div>
      </div>

      <div
        className={`product-price-row${outOfStock ? ' product-price-row--oos' : ''}${
          showSeller ? '' : ' product-price-row--tight'
        }`}
      >
        <span
          className={`product-price-sale product-card__price${
            discount > 0 ? ' product-price-sale--deal' : ''
          }`}
        >
          <span className="product-price-currency" aria-hidden>
            $
          </span>
          <span className="product-price-amount tabular-nums">{product.price}</span>
        </span>
        {product.original_price != null && product.original_price > product.price ? (
          <span className="product-price-compare tabular-nums">${product.original_price}</span>
        ) : null}
      </div>

      {showAddToCart ? (
        outOfStock ? (
          <button
            type="button"
            disabled
            className="product-card-cta product-card-cta--oos"
            aria-disabled="true"
          >
            {productOosLabel(t, product)}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              addItem(product);
              setJustAdded(true);
            }}
            className={`product-card-cta${justAdded ? ' is-added' : ''}`}
            aria-live="polite"
          >
            {justAdded ? (
              <>
                <Check size={15} className="product-card-cta__icon" aria-hidden />
                {t('تمت الإضافة', 'Added')}
              </>
            ) : (
              <>
                <ShoppingCart size={15} className="product-card-cta__icon" aria-hidden />
                {t('أضف للسلة', 'Add to Cart')}
              </>
            )}
          </button>
        )
      ) : null}
    </div>
  );

  const cardClass = `product-card card card-sm bg-base-200 border border-base-300 h-full${
    outOfStock ? ' is-oos' : ''
  }${discount > 0 ? ' is-deal' : ''}${use3d ? ' is-hover3d' : ''}`;
  const tiltStyle = {
    '--rx': '0deg',
    '--ry': '0deg',
    ...(auraOnTilt ? auraWrap.style : undefined),
  } as CSSProperties;

  const card = auraOnTilt ? (
    <AuraFrame
      ref={tiltFaceRef}
      className={`product-card__tilt-face product-card-aura ${auraWrap.className} h-full`}
      style={tiltStyle}
      color={product.aura_color}
      electric={electricTune}
    >
      <article aria-label={name} className={cardClass}>
        {figure}
        {body}
      </article>
    </AuraFrame>
  ) : (
    <article ref={cardRef} aria-label={name} className={cardClass}>
      {use3d ? (
        <div ref={tiltFaceRef} className="product-card__tilt-face" style={tiltStyle}>
          {figure}
          {body}
        </div>
      ) : (
        <>
          {figure}
          {body}
        </>
      )}
    </article>
  );

  if (!hasAura || auraOnTilt) return card;
  return (
    <AuraFrame
      className={`product-card-aura ${auraWrap.className} h-full`}
      style={auraWrap.style}
      color={product.aura_color}
      electric={electricTune}
    >
      {card}
    </AuraFrame>
  );
}

// Grids re-render on every keystroke of the store search — skip unchanged cards.
export default memo(ProductCard);
