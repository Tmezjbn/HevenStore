import { Link } from 'react-router-dom';
import { useI18n } from '../../lib/i18n';
import { useProductsByCategoryId } from '../../hooks/useCatalog';
import Reveal from '../ui/Reveal';
import ProductCard from '../ui/ProductCard';
import type { Category } from '../../types';

/** Homepage grid: products with this exact category_id only (not descendants). */
export default function CategoryProductsSection({
  categoryId,
  category,
}: {
  categoryId: string;
  category: Category | undefined;
}) {
  const { t, lang } = useI18n();
  const { data: products = [], isLoading } = useProductsByCategoryId(categoryId, 12);
  const ar = lang === 'ar';
  const title = category
    ? ar
      ? category.name_ar || category.name
      : category.name
    : t('منتجات', 'Products');

  if (isLoading) return null;
  if (products.length === 0) return null;

  return (
    <Reveal
      key={`cat-${categoryId}`}
      id={`category-${categoryId}`}
      as="section"
      className="py-8 px-4 sm:px-6 max-w-7xl mx-auto"
    >
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2 className="text-3xl font-bold">{title}</h2>
        <Link
          to={
            category?.slug
              ? `/store?category=${encodeURIComponent(category.slug)}`
              : '/store'
          }
          className="btn btn-ghost btn-sm"
        >
          {t('عرض الكل', 'View all')}
        </Link>
      </div>
      <div className="home-stagger grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
        {products.map((p, i) => (
          <div key={p.id} style={{ ['--i' as string]: i }}>
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </Reveal>
  );
}
