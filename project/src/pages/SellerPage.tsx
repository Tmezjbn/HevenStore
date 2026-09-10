import { lazy, Suspense, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, PackageOpen } from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { usePageMeta } from '../hooks/usePageMeta';
import { supabase } from '../lib/supabase';
import { PRODUCT_LIST_COLS } from '../hooks/useCatalog';
import { roleLabel } from '../lib/roles';
import ProductCard from '../components/ui/ProductCard';
import ProfileBadgeStrip from '../components/ui/ProfileBadgeStrip';
import UserAvatar from '../components/ui/UserAvatar';
import type { Product, Role } from '../types';

const FindMoreProducts = lazy(() => import('../components/product/FindMoreProducts'));

type SellerPublic = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  role: string | null;
};

function productCountLabel(n: number, lang: 'ar' | 'en', t: (ar: string, en: string) => string) {
  if (lang === 'ar') {
    if (n === 0) return t('لا منتجات', '0 products');
    if (n === 1) return 'منتج واحد';
    if (n === 2) return 'منتجان';
    if (n >= 3 && n <= 10) return `${n} منتجات`;
    return `${n} منتجًا`;
  }
  return n === 1 ? '1 product' : `${n} products`;
}

function gridClass(n: number): string {
  if (n <= 1) return 'grid-cols-1 max-w-sm mx-auto';
  if (n === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto';
  return 'grid-cols-2 md:grid-cols-3';
}

export default function SellerPage() {
  const { id: slug } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, lang, contentDir } = useI18n();
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const sellerQ = useQuery({
    queryKey: ['seller', slug],
    enabled: Boolean(slug),
    queryFn: async (): Promise<SellerPublic | null> => {
      const { data, error } = await supabase.rpc('get_seller_public', { p_key: slug });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as SellerPublic) ?? null;
    },
  });

  useEffect(() => {
    const u = sellerQ.data?.username?.trim();
    if (!u || !slug) return;
    if (slug.toLowerCase() === u) return;
    navigate(`/seller/${u}`, { replace: true });
  }, [sellerQ.data?.username, slug, navigate]);

  const sellerName = sellerQ.data?.full_name?.trim() || t('بائع', 'Seller');
  usePageMeta({
    title: sellerName,
    description: t(`منتجات ${sellerName} على HEVEN.FUN`, `${sellerName}'s products on HEVEN.FUN`),
    image: sellerQ.data?.avatar_url,
  });

  const productsQ = useQuery({
    queryKey: ['products', 'seller', sellerQ.data?.id],
    enabled: Boolean(sellerQ.data?.id),
    queryFn: async (): Promise<Product[]> => {
      const sellerId = sellerQ.data?.id;
      if (!sellerId) return [];
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_LIST_COLS)
        .eq('status', 'active')
        .eq('seller_id', sellerId)
        .eq('show_seller_name', true)
        .order('created_at', { ascending: false })
        .limit(48);
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });

  if (sellerQ.isLoading) {
    return (
      <div className="min-h-screen bg-base-100 pt-24 px-4" dir={contentDir}>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-5">
            <div className="skeleton w-20 h-20 shrink-0 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="skeleton h-7 w-48" />
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!sellerQ.data) {
    return (
      <div className="min-h-screen bg-base-100 pt-24 flex items-center justify-center px-4" dir={contentDir}>
        <div className="text-center space-y-3 max-w-sm">
          <UserAvatar sizeClass="w-16" className="mx-auto" />
          <h1 className="text-xl font-bold text-balance">{t('البائع غير متاح', 'Seller not available')}</h1>
          <p className="text-sm text-base-content/70 text-pretty">
            {t('هذا الملف غير عام أو غير موجود.', 'This profile is not public or does not exist.')}
          </p>
          <Link to="/store" className="btn btn-primary btn-sm gap-2">
            <BackIcon size={14} />
            {t('تصفح المنتجات', 'Browse products')}
          </Link>
        </div>
      </div>
    );
  }

  const seller = sellerQ.data;
  const name = seller.full_name?.trim() || t('بائع', 'Seller');
  const role = (seller.role || 'seller') as Role;
  const products = (productsQ.data ?? []).map((p) => ({
    ...p,
    seller: {
      id: seller.id,
      username: seller.username,
      full_name: seller.full_name,
      avatar_url: seller.avatar_url,
      email: null,
      role,
      is_active: true,
      show_seller_name: true,
      created_at: '',
      updated_at: '',
    },
  }));
  const count = products.length;
  const allOos = count > 0 && products.every((p) => p.stock <= 0);
  const findExclude = products[0]?.id;

  return (
    <div className="min-h-screen bg-base-100 pt-20 pb-16" dir={contentDir}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <Link to="/store" className="btn btn-ghost btn-sm gap-2 -ms-2 text-base-content/80">
          <BackIcon size={14} />
          {t('العودة للمتجر', 'Back to store')}
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
          <UserAvatar
            name={name}
            avatarUrl={seller.avatar_url}
            sizeClass="w-20 h-20"
            className="shrink-0"
          />
          <div className="min-w-0 space-y-2 text-start">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl sm:text-[2rem] font-bold tracking-tight text-balance leading-tight">
                {name}
              </h1>
              <span className="badge badge-outline badge-sm font-medium border-base-content/25 text-base-content/80">
                {roleLabel(role, lang)}
              </span>
            </div>
            {seller.username && (
              <p className="text-sm font-mono text-base-content/75" dir="ltr">
                @{seller.username}
              </p>
            )}
            <ProfileBadgeStrip userId={seller.id} size={16} className="!mt-0" />
            <p className="text-sm font-medium text-base-content/80 tabular-nums">
              {productsQ.isLoading ? '…' : productCountLabel(count, lang, t)}
            </p>
          </div>
        </header>

        {productsQ.isLoading ? (
          <div className={`grid gap-4 ${gridClass(3)}`}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : count === 0 ? (
          <div className="rounded-xl border border-base-300 bg-base-200/60 px-6 py-14 text-center space-y-4">
            <PackageOpen size={36} className="mx-auto text-base-content/40" />
            <p className="text-sm text-base-content/75 text-pretty">
              {t('لا منتجات عامة لهذا البائع.', 'No public products from this seller.')}
            </p>
            <Link to="/store" className="btn btn-primary btn-sm gap-2">
              <BackIcon size={14} />
              {t('تصفح المتجر', 'Browse store')}
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {allOos && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-pretty text-base-content/85">
                {t(
                  'منتجات هذا البائع غير متوفرة حالياً — تصفح المتجر أو شاهد اقتراحات أدناه.',
                  'This seller’s products are out of stock — browse the store or see suggestions below.',
                )}{' '}
                <Link to="/store" className="link link-primary font-medium">
                  {t('المتجر', 'Store')}
                </Link>
              </div>
            )}
            <div className={`grid gap-4 ${gridClass(count)}`}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {allOos && findExclude && (
              <Suspense fallback={null}>
                <FindMoreProducts excludeProductId={findExclude} />
              </Suspense>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
