import ProductMedia from '../../../components/ui/ProductMedia';
import { ImagePlus } from 'lucide-react';
import { ProductForm } from './formModel';
import { Product } from '../../../types';

type PreviewRailProps = {
  form: ProductForm;
  summaryName: string;
  statusChipClass: "product-editor__chip product-editor__chip--ok" | "product-editor__chip product-editor__chip--warn" | "product-editor__chip product-editor__chip--danger" | "product-editor__chip product-editor__chip--mute";
  statusLabel: (s: Product["status"]) => string;
  t: (ar: string, en: string) => string;
  stockNum: number;
  tocLink: (id: string, labelAr: string, labelEn: string) => JSX.Element;
  productAtmOn: boolean;
};

export default function PreviewRail({
  form,
  summaryName,
  statusChipClass,
  statusLabel,
  t,
  stockNum,
  tocLink,
  productAtmOn,
}: PreviewRailProps) {
  return (
    <>
        <aside className="hidden lg:block">
          <div className="pe-rail">
            <div className="pe-preview">
            {form.thumbnail_url ? (
                <div className="pe-preview__media">
                <ProductMedia src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
                <div className="pe-preview__media pe-preview__media--empty" aria-hidden>
                  <ImagePlus size={24} />
              </div>
            )}
              <p className="pe-preview__name line-clamp-2">{summaryName}</p>
              <p className="pe-preview__price tabular-nums">
                {form.price ? `$${form.price}` : '—'}
              </p>
              <div className="pe-preview__stats">
                <span className={statusChipClass}>{statusLabel(form.status)}</span>
                <span className="product-editor__chip tabular-nums">
                  {t('المخزون', 'Stock')} · {stockNum}
              </span>
            </div>
            </div>
            <nav className="pe-toc" aria-label={t('أقسام النموذج', 'Form sections')}>
              <p className="pe-toc__label">{t('انتقال', 'Jump')}</p>
              {tocLink('pe-basics', 'الأساسيات', 'Basics')}
              {tocLink('pe-pricing', 'التسعير', 'Pricing')}
              {tocLink('pe-fulfill', 'التسليم', 'Fulfillment')}
              {tocLink('pe-copy', 'الوصف', 'Description')}
              {tocLink('pe-fx', 'التأثيرات', 'Effects')}
              {productAtmOn ? tocLink('pe-atm', 'الأجواء', 'Atmosphere') : null}
              {tocLink('pe-media', 'الوسائط', 'Media')}
              {tocLink('pe-seller', 'البائع', 'Seller')}
              {tocLink('pe-req', 'المتطلبات', 'Requirements')}
              {tocLink('pe-author', 'أضيف بواسطة', 'Added by')}
            </nav>
          </div>
        </aside>
    </>
  );
}
