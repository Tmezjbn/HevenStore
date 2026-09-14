import { BadgePercent } from 'lucide-react';

interface DiscountBadgeProps {
  percent: number;
  className?: string;
}

/** Shared deal chip for product media — rare primary signal, not quiet gray. */
export default function DiscountBadge({ percent, className = '' }: DiscountBadgeProps) {
  if (percent <= 0) return null;
  return (
    <div className={`product-discount-badge ${className}`.trim()}>
      <BadgePercent className="product-discount-badge__icon" aria-hidden strokeWidth={2.5} />
      <span className="product-discount-badge__value">-{percent}%</span>
    </div>
  );
}
