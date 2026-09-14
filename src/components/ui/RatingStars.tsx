import { Star } from 'lucide-react';
import { starFillAmount } from '../../lib/productRating';

type Props = {
  value: number;
  size?: number;
  className?: string;
  label?: string;
};

/** Storefront stars — supports fractional fill (e.g. 4.9 → last star 90%). */
export default function RatingStars({ value, size = 14, className = '', label }: Props) {
  return (
    <div
      className={`rating-stars inline-flex items-center gap-0.5 ${className}`.trim()}
      role="img"
      aria-label={label ?? `${value} / 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = starFillAmount(value, i);
        return (
          <span key={i} className="rating-stars__slot" aria-hidden>
            <Star size={size} className="rating-stars__empty" strokeWidth={1.75} />
            {fill > 0 ? (
              <span className="rating-stars__fill" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="rating-stars__on" strokeWidth={0} />
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
