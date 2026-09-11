import { useEffect, useMemo, useState } from 'react';
import { Search, PackageOpen, RefreshCw, ChevronDown, ChevronRight, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../lib/i18n';
import { useCategories, useProducts, useProductsByIds } from '../hooks/useCatalog';
import { usePageMeta } from '../hooks/usePageMeta';
import { useSiteSettings } from '../hooks/useSiteSettings';
import {
  DEFAULT_STORE_SECTIONS,
  parseCategoryProductsSectionId,
  parseFeaturedProductIds,
  parseSections,
  parseStoreCategoryTreeExpand,
  parseStoreFeaturedMirrorHome,
} from '../lib/siteSettings';
import {
  buildCategoryForest,
  descendantIds,
  findCategoryBySlug,
  type CategoryNode,
} from '../lib/categories';
import {
  parseStoreSort,
  sortProducts,
  STORE_SORT_KEYS,
  storeSortLabel,
  type StoreSortKey,
} from '../lib/storeSort';
import ProductCard from '../components/ui/ProductCard';
import SearchFxShell from '../components/ui/SearchFxShell';
import CategoryProductsSection from '../components/home/CategoryProductsSection';
import type { Category, Product } from '../types';

type CatalogProps = {
  /** Limit the catalog to these product types (e.g. gift_card). */
  types?: Product['product_type'][];
  titleAr?: string;
  titleEn?: string;
};

/** Cards rendered per "page" — keeps first paint light on large catalogs. */
const PAGE_SIZE = 20;

export default function GamesPage({ types, titleAr, titleEn }: CatalogProps = {}) {
  const { t, lang, contentDir } = useI18n();
  const pageTitle = titleAr && titleEn ? t(titleAr, titleEn) : t('الألعاب والمنتجات', 'Games & Products');
  usePageMeta({
    title: pageTitle,
    description: t(
      'تصفح الألعاب والاشتراكات والمفاتيح الرقمية على HEVEN.FUN',
      'Browse games, subscriptions, and digital keys on HEVEN.FUN',
    ),
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const categorySlug = searchParams.get('category') ?? '';
  const sort = parseStoreSort(searchParams.get('sort'));
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(() => new Set());
  /** Local input; URL `q` updates after debounce (PERF-5). */
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft === search) return;
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          const trimmed = searchDraft.trim();
          if (trimmed) p.set('q', trimmed);
          else p.delete('q');
          return p;
        },
        { replace: true },
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [searchDraft, search, setSearchParams]);

  const setSort = (next: StoreSortKey) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === 'popular') p.delete('sort');
        else p.set('sort', next);
        return p;
      },
      { replace: true },
    );
  };

  const setCategorySlug = (slug: string | null) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (slug) p.set('category', slug);
        else p.delete('category');
        return p;
      },
      { replace: true },
    );
  };

  const { data: products = [], isLoading, isError, refetch } = useProducts(
    types?.length ? { types } : undefined,
  );
  const { data: categories = [] } = useCategories();
  const { settings } = useSiteSettings();
  const storeSections = parseSections(settings.store_sections, DEFAULT_STORE_SECTIONS);
  const showSearch = storeSections.find((s) => s.id === 'search')?.enabled ?? true;
  const showSort = storeSections.find((s) => s.id === 'sort')?.enabled ?? true;
  const treeExpandEnabled = parseStoreCategoryTreeExpand(settings.store_category_tree_expand);
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );
  const forest = useMemo(() => buildCategoryForest(categories), [categories]);
  const activeCategory = useMemo(
    () => findCategoryBySlug(categories, categorySlug),
    [categories, categorySlug],
  );
  const activeCatIds = useMemo(
    () => (activeCategory ? new Set(descendantIds(categories, activeCategory.id)) : null),
    [categories, activeCategory],
  );

  const homeFeaturedIds = parseFeaturedProductIds(settings.home_featured_product_ids);
  const storeFeaturedIds = parseFeaturedProductIds(settings.store_featured_product_ids);
  const mirrorHome = parseStoreFeaturedMirrorHome(settings.store_featured_mirror_home);
  const exploreFeaturedIds = mirrorHome ? homeFeaturedIds : storeFeaturedIds;
  const { data: exploreFeatured = [] } = useProductsByIds(exploreFeaturedIds);
  const showFeatured = exploreFeaturedIds.length > 0 && exploreFeatured.length > 0;

  const categorySections = useMemo(
    () =>
      storeSections.filter(
        (s) => s.enabled && parseCategoryProductsSectionId(s.id) !== null,
      ),
    [storeSections],
  );

  const filtered = useMemo(() => {
    const pool = types ? products.filter((p) => types.includes(p.product_type)) : products;
    const byCat = activeCatIds
      ? pool.filter((p) => p.category_id != null && activeCatIds.has(p.category_id))
      : pool;
    const q = search.trim().toLowerCase();
    const matched = q
      ? byCat.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.name_ar !== null && p.name_ar.toLowerCase().includes(q)),
        )
      : byCat;
    return sortProducts(matched, sort);
  }, [products, types, search, sort, activeCatIds]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, sort, types, categorySlug]);

  // Auto-expand ancestors of the active category so the chip path stays visible.
  useEffect(() => {
    if (!activeCategory) return;
    const next = new Set<string>();
    let cur: Category | undefined = activeCategory;
    while (cur?.parent_id) {
      next.add(cur.parent_id);
      cur = categoryById.get(cur.parent_id);
    }
    setExpandedCatIds((prev) => {
      let changed = false;
      for (const id of next) {
        if (!prev.has(id)) {
          changed = true;
          break;
        }
      }
      if (!changed) return prev;
      const merged = new Set(prev);
      for (const id of next) merged.add(id);
      return merged;
    });
  }, [activeCategory, categoryById]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = Math.max(0, filtered.length - visibleCount);
  const activeCatLabel = activeCategory
    ? lang === 'ar'
      ? activeCategory.name_ar || activeCategory.name
      : activeCategory.name
    : '';

  const toggleExpand = (id: string) => {
    setExpandedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="catalog-page min-h-screen bg-base-100 pt-20 pb-16" dir={contentDir}>
      <div className="catalog-page__inner max-w-7xl mx-auto px-4 sm:px-6">
        <header className="catalog-page-hero">
          <h1 className="catalog-page-title">
            {titleAr && titleEn ? t(titleAr, titleEn) : t('الألعاب والمنتجات', 'Games & Products')}
          </h1>
        </header>

        {showFeatured ? (
          <section className="catalog-featured mb-10" aria-labelledby="store-featured-heading">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="store-featured-heading" className="text-2xl font-bold">
                {t('مميز', 'Featured')}
              </h2>
            </div>
            <div className="catalog-grid">
              {exploreFeatured.map((p, i) => (
                <div
                  key={p.id}
                  className="catalog-grid__cell"
                  style={{ ['--i' as string]: Math.min(i, 11) }}
                >
                  <ProductCard product={p} />
        </div>
              ))}
            </div>
          </section>
        ) : null}

        {forest.length > 0 ? (
          <nav className="catalog-cat-tree" aria-label={t('تصفح التصنيفات', 'Browse categories')}>
            <CategoryChipTree
              nodes={forest}
              expandedIds={expandedCatIds}
              expandEnabled={treeExpandEnabled}
              activeSlug={activeCategory?.slug ?? ''}
              lang={lang}
              t={t}
              onToggleExpand={toggleExpand}
              onSelect={setCategorySlug}
            />
            {activeCategory ? (
        <button
                type="button"
                className="catalog-cat-tree__clear"
                onClick={() => setCategorySlug(null)}
        >
                <X size={14} aria-hidden />
                {t(`مسح: ${activeCatLabel}`, `Clear: ${activeCatLabel}`)}
        </button>
            ) : null}
          </nav>
        ) : null}

        {(showSearch || showSort) && (
          <div className="catalog-toolbar">
            {showSearch && (
              <SearchFxShell className="nav-search-fx--plain catalog-toolbar__search">
                <span className="nav-search-fx__search-icon" aria-hidden>
                  <Search size={18} strokeWidth={2} />
                </span>
            <input
                  type="search"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
              placeholder={t('ابحث عن منتج...', 'Search products...')}
                  className="nav-search-fx__input"
                  aria-label={t('بحث عن منتج', 'Search products')}
                />
                <span className="nav-search-fx__input-mask" aria-hidden />
                <span className="nav-search-fx__accent-blob" aria-hidden />
              </SearchFxShell>
            )}
            {showSort && (
              <SearchFxShell className="nav-search-fx--sort catalog-toolbar__sort">
            <select
              value={sort}
                  onChange={(e) => setSort(e.target.value as StoreSortKey)}
                  className="nav-search-fx__select"
                  aria-label={t('ترتيب حسب', 'Sort by')}
                >
                  {STORE_SORT_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {storeSortLabel(key, t)}
                    </option>
                  ))}
            </select>
                <span className="nav-search-fx__accent-blob" aria-hidden />
              </SearchFxShell>
            )}
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 ? (
          <p className="catalog-count" aria-live="polite">
            {t(`${filtered.length} منتج`, filtered.length === 1 ? '1 product' : `${filtered.length} products`)}
            {activeCatLabel ? (
              <span className="catalog-count__q">
                {' '}
                · {t(`تصنيف: ${activeCatLabel}`, `in “${activeCatLabel}”`)}
              </span>
            ) : null}
            {search.trim() ? (
              <span className="catalog-count__q">
                {' '}
                · {t(`بحث: ${search.trim()}`, `for “${search.trim()}”`)}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="sr-only" aria-live="polite">
            {isLoading
              ? t('جارٍ التحميل...', 'Loading...')
              : t(`${filtered.length} منتج متاح`, `${filtered.length} products available`)}
          </p>
        )}

        {isLoading ? (
          <div className="catalog-grid" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="catalog-skel" style={{ ['--i' as string]: i }}>
                <div className="catalog-skel__media skeleton" />
                <div className="catalog-skel__body">
                  <div className="skeleton h-4 w-4/5" />
                  <div className="skeleton h-3 w-1/2" />
                  <div className="skeleton h-6 w-1/3 mt-1" />
                  <div className="skeleton h-9 w-full mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="catalog-state">
            <h2 className="catalog-state__title">{t('تعذر تحميل المنتجات', 'Could not load products')}</h2>
            <p className="catalog-state__text text-base-content/70">
              {t('تحقق من اتصالك بالإنترنت ثم حاول مجدداً.', 'Check your connection and try again.')}
            </p>
            <button type="button" onClick={() => refetch()} className="btn btn-primary btn-sm gap-2">
              <RefreshCw size={14} />
              {t('إعادة المحاولة', 'Retry')}
          </button>
        </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="catalog-grid">
              {visible.map((p, i) => (
                <div key={p.id} className="catalog-grid__cell" style={{ ['--i' as string]: Math.min(i, 11) }}>
                  <ProductCard product={p} />
                </div>
          ))}
        </div>
            {remaining > 0 ? (
              <div className="catalog-more">
                <button
                  type="button"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="catalog-more__btn"
                >
                  {t(`عرض المزيد (${remaining})`, `Show more (${remaining})`)}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="catalog-state catalog-state--empty">
            <div className="catalog-state__icon" aria-hidden>
              <PackageOpen size={28} />
            </div>
            <h2 className="catalog-state__title">
              {search || activeCategory
                ? t('لا توجد نتائج مطابقة', 'No matching results')
                : t('لا توجد منتجات بعد', 'No products yet')}
            </h2>
            <p className="catalog-state__text text-base-content/70">
              {search || activeCategory
                ? t('جرّب كلمات بحث أو تصنيفاً مختلفاً.', 'Try different search or category.')
                : t(
                    'ستظهر المنتجات هنا بمجرد أن يضيفها صاحب المتجر من لوحة التحكم.',
                    'Products will appear here once the store owner adds them from the dashboard.',
                  )}
            </p>
          </div>
        )}

        {categorySections.length > 0 ? (
          <div className="catalog-cat-sections mt-12 space-y-2">
            {categorySections.map((section) => {
              const catId = parseCategoryProductsSectionId(section.id);
              if (!catId) return null;
              return (
                <CategoryProductsSection
                  key={section.id}
                  categoryId={catId}
                  category={categoryById.get(catId)}
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CategoryChipTree({
  nodes,
  expandedIds,
  expandEnabled,
  activeSlug,
  lang,
  t,
  onToggleExpand,
  onSelect,
  depth = 0,
}: {
  nodes: CategoryNode[];
  expandedIds: Set<string>;
  expandEnabled: boolean;
  activeSlug: string;
  lang: string;
  t: (ar: string, en: string) => string;
  onToggleExpand: (id: string) => void;
  onSelect: (slug: string | null) => void;
  depth?: number;
}) {
  return (
    <ul className="catalog-cat-tree__row" style={{ ['--depth' as string]: depth }}>
      {nodes.map((node) => {
        const label = lang === 'ar' ? node.name_ar || node.name : node.name;
        const hasKids = node.children.length > 0;
        const open = expandEnabled && expandedIds.has(node.id);
        const active = node.slug === activeSlug;
        return (
          <li key={node.id} className="catalog-cat-tree__item">
            <div className="catalog-cat-tree__chip-wrap">
              {expandEnabled ? (
                hasKids ? (
                  <button
                    type="button"
                    className="catalog-cat-tree__expand"
                    aria-expanded={open}
                    aria-label={
                      open
                        ? t(`طي ${label}`, `Collapse ${label}`)
                        : t(`توسيع ${label}`, `Expand ${label}`)
                    }
                    onClick={() => onToggleExpand(node.id)}
                  >
                    {open ? (
                      <ChevronDown size={14} aria-hidden />
                    ) : (
                      <ChevronRight size={14} className="rtl:rotate-180" aria-hidden />
                    )}
                  </button>
                ) : (
                  <span className="catalog-cat-tree__expand-spacer" aria-hidden />
                )
              ) : null}
              <button
                type="button"
                className={`catalog-cat-tree__chip${active ? ' catalog-cat-tree__chip--active' : ''}`}
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(active ? null : node.slug)}
              >
                {label}
              </button>
            </div>
            {expandEnabled && hasKids && open ? (
              <CategoryChipTree
                nodes={node.children}
                expandedIds={expandedIds}
                expandEnabled={expandEnabled}
                activeSlug={activeSlug}
                lang={lang}
                t={t}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                depth={depth + 1}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
