import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { useWishlistStore } from '../stores/wishlistStore';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { useProductsByIds } from '../hooks/useCatalog';
import ProductCard from '../components/ui/ProductCard';

export default function WishlistPage() {
  const { t, contentDir } = useI18n();
  usePageMeta({ title: t('قائمة المفضلة', 'Wishlist'), noindex: true });
  const { items, clear, hydrateFromLive } = useWishlistStore();
  const ids = items.map((p) => p.id);
  const { data: live, isSuccess: liveReady } = useProductsByIds(ids);
  useEffect(() => {
    if (!liveReady || ids.length === 0) return;
    hydrateFromLive(live ?? []);
  }, [liveReady, live, ids.length, hydrateFromLive]);

  return (
    <div className="min-h-screen bg-base-100 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" dir={contentDir}>
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart size={22} className="text-error" />
            {t('قائمة المفضلة', 'Wishlist')}
          </h1>
          {items.length > 0 && (
            <button type="button" onClick={clear} className="btn btn-ghost btn-sm gap-2 text-error">
              <Trash2 size={14} />
              {t('مسح الكل', 'Clear all')}
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <Heart size={48} className="opacity-20 mx-auto mb-4" />
            <p className="opacity-70 mb-2">{t('قائمة المفضلة فارغة', 'Your wishlist is empty')}</p>
            <p className="text-sm text-base-content/70 mb-6">
              {t('اضغط على القلب في أي منتج لحفظه هنا.', 'Tap the heart on any product to save it here.')}
            </p>
            <Link to="/store" className="btn btn-primary">{t('تصفح المتجر', 'Explore Store')}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
