import type { AtmosphereRouteKey } from './siteSettings';

/** Map storefront pathname → atmosphere route key (not footer/drawer chrome). */
export function atmospherePageFromPath(pathname: string): AtmosphereRouteKey {
  const p = pathname.replace(/\/+$/, '') || '/';
  if (p === '/') return 'home';
  if (p === '/store') return 'store';
  if (p === '/subscriptions') return 'subscriptions';
  if (p === '/gift-cards') return 'giftCards';
  if (p.startsWith('/product/')) return 'product';
  if (p.startsWith('/seller/')) return 'seller';
  if (p === '/cart') return 'cart';
  if (p.startsWith('/checkout/')) return 'checkout';
  if (p === '/wishlist') return 'wishlist';
  if (
    p === '/about' ||
    p === '/privacy' ||
    p === '/terms' ||
    p === '/updates' ||
    p === '/changelog'
  ) {
    return 'about';
  }
  return 'other';
}
