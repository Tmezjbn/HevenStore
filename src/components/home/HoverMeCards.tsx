import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import ProductMedia from '../ui/ProductMedia';
import type { Product } from '../../types';

interface HoverMeCardsProps {
  products: Product[];
}

/** Total stack faces from stock: 0–1 → 1 (flat), 2–5 → that many, 6+ → 5. */
function stackCount(stock: number): number {
  if (stock < 2) return 1;
  return Math.min(stock, 5);
}

export default function HoverMeCards({ products }: HoverMeCardsProps) {
  const { t, lang } = useI18n();
  const ar = lang === 'ar';

  if (products.length === 0) return null;

  return (
    <div className="hover-me-grid">
      {products.map((product) => {
        const name = ar ? product.name_ar || product.name : product.name;
        const total = stackCount(product.stock);
        const backs = total - 1;
        const layers = Array.from({ length: total }, (_, i) => i);
        const front = total - 1;

        return (
          <Link
            key={product.id}
            to={`/product/${product.slug}`}
            className={`hover-me-card${backs === 0 ? ' hover-me-card--flat' : ''}`}
            style={{ ['--bg-n' as string]: backs }}
            aria-label={`${name} — $${product.price}`}
          >
            {layers.map((i) => {
              const isFront = i === front;
              const mid = (backs - 1) / 2;
              const fan = isFront || backs <= 1 ? 0 : i - mid;
              return (
                <p
                  key={i}
                  className={isFront ? 'hover-me-card__front' : 'hover-me-card__back'}
                  style={
                    isFront
                      ? { zIndex: total }
                      : {
                          zIndex: i + 1,
                          ['--fan' as string]: fan,
                          ['--fan-abs' as string]: Math.abs(fan),
                        }
                  }
                  aria-hidden={!isFront}
                >
                  <span className="hover-me-card__face">
                    {product.hover_image_url || product.thumbnail_url ? (
                      <ProductMedia
                        src={product.hover_image_url || product.thumbnail_url || ''}
                        alt=""
                        className="hover-me-card__img"
                        width={480}
                        sizes="(max-width: 768px) 70vw, 280px"
                      />
                    ) : (
                      <span className="hover-me-card__fallback" />
                    )}
                    <span className="hover-me-card__label">
                      {isFront ? name : t('مرّر فوقي', 'HOVER ME')}
                    </span>
                    {isFront && (
                      <span className="hover-me-card__price tabular-nums">${product.price}</span>
                    )}
                  </span>
                </p>
              );
            })}
          </Link>
        );
      })}
    </div>
  );
}
