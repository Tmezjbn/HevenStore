import { Star, CircleDollarSign } from 'lucide-react';
import { type ReactNode } from 'react';
import { ProductForm } from './formModel';
import { Product } from '../../../types';

type PricingSectionProps = {
  primarySection: (titleAr: string, titleEn: string, children: ReactNode, opts?: { id?: string; icon?: ReactNode; hintAr?: string; hintEn?: string; accent?: "default" | "commerce" | "fulfill" | "basics" | "copy"; i?: number; collapsible?: boolean; summary?: string; defaultOpen?: boolean; }) => JSX.Element;
  form: ProductForm;
  discountPct: number;
  statusLabel: (s: Product["status"]) => string;
  t: (ar: string, en: string) => string;
  stockNum: number;
  keyedProduct: boolean;
  setField: (key: keyof ProductForm, value: string) => void;
  field: (labelAr: string, labelEn: string, node: ReactNode, hint?: [string, string]) => JSX.Element;
  keyCounts: { available: number; claimed: number; };
  pendingKeyCount: number;
  isSeller: boolean;
  needsReview: boolean;
  editing: Product | null;
};

export default function PricingSection({
  primarySection,
  form,
  discountPct,
  statusLabel,
  t,
  stockNum,
  keyedProduct,
  setField,
  field,
  keyCounts,
  pendingKeyCount,
  isSeller,
  needsReview,
  editing,
}: PricingSectionProps) {
  return (
    <>
            {primarySection(
              'التسعير والمخزون',
              'Pricing & stock',
              <div className="pe-pricing">
                <div className="pe-pricing__deal" aria-live="polite">
                  <div className="pe-pricing__deal-main">
                    <span className="pe-pricing__deal-price tabular-nums">
                      {form.price.trim() ? `$${form.price}` : '—'}
                    </span>
                    {discountPct > 0 ? (
                      <>
                        <span className="pe-pricing__deal-was tabular-nums">
                          ${form.original_price}
                        </span>
                        <span className="pe-pricing__deal-off tabular-nums">−{discountPct}%</span>
                      </>
                    ) : null}
              </div>
                  <div className="pe-pricing__deal-meta">
                    <span
                      className={`pe-pricing__pill pe-pricing__pill--${form.status}`}
                    >
                      {statusLabel(form.status)}
                    </span>
                    <span className="pe-pricing__pill tabular-nums">
                      {t('المخزون', 'Stock')} · {stockNum}
                    </span>
                    {keyedProduct ? (
                      <span className="pe-pricing__pill pe-pricing__pill--keys">
                        {t('من المفاتيح', 'From keys')}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="pe-pricing__zone">
                  <div className="pe-pricing__zone-head">
                    <h3 className="pe-pricing__zone-title">{t('السعر', 'Price')}</h3>
                    <p className="pe-pricing__zone-hint text-pretty">
                      {t('السعر الحالي والقديم للخصم.', 'Sale price and compare-at for discount.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    <label className="pe-field">
                      <span className="pe-field__label">{t('السعر', 'Price')}</span>
                      <div className="pe-pricing__money">
                        <span className="pe-pricing__money-prefix" aria-hidden>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.price}
                          onChange={(e) => setField('price', e.target.value)}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      </div>
                    </label>
                    <label className="pe-field">
                      <span className="pe-field__label">{t('السعر قبل الخصم', 'Original price')}</span>
                      <div className="pe-pricing__money">
                        <span className="pe-pricing__money-prefix" aria-hidden>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.original_price}
                          onChange={(e) => setField('original_price', e.target.value)}
                          placeholder={t('اختياري', 'Optional')}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="pe-pricing__zone">
                  <div className="pe-pricing__zone-head">
                    <h3 className="pe-pricing__zone-title">{t('المخزون والحالة', 'Stock & status')}</h3>
                    <p className="pe-pricing__zone-hint text-pretty">
                      {keyedProduct
                        ? t('المخزون يتبع وحدات التسليم.', 'Stock follows fulfillment units.')
                        : t('الكمية اليدوية عندما لا توجد مفاتيح.', 'Manual qty when there are no keys.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    {field(
                      'المخزون',
                      'Stock',
                  keyedProduct ? (
                      <input
                        type="number"
                        value={keyCounts.available + pendingKeyCount}
                        disabled
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      ) : (
                    <input
                      type="number"
                          min="0"
                          value={form.stock}
                          onChange={(e) => setField('stock', e.target.value)}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      ),
                      keyedProduct
                        ? ['يُحسب من المفاتيح غير المستخدمة', 'Synced from unused one-time keys']
                        : undefined,
                    )}
                    <div className="pe-field">
                      <span className="pe-field__label">{t('الحالة', 'Status')}</span>
                      <div className="pe-pricing__status" role="group" aria-label={t('الحالة', 'Status')}>
                        {([
                          ['draft', 'مسودة', 'Draft'],
                          ['active', 'نشط', 'Active'],
                          ['inactive', 'غير نشط', 'Inactive'],
                          // Review states are display-only context, not choices.
                          ...(form.status === 'pending_review'
                            ? ([['pending_review', 'قيد المراجعة', 'In review']] as const)
                            : []),
                          ...(form.status === 'rejected'
                            ? ([['rejected', 'مرفوض', 'Rejected']] as const)
                            : []),
                        ] as const).map(([id, ar, en]) => (
                          <button
                            key={id}
                            type="button"
                            className={`pe-pricing__status-btn pe-pricing__status-btn--${id}${
                              form.status === id ? ' is-active' : ''
                            }`}
                            aria-pressed={form.status === id}
                            onClick={() => setField('status', id)}
                          >
                            {t(ar, en)}
                          </button>
                        ))}
                  </div>
                  {isSeller && needsReview ? (
                    <p className="pe-field__hint text-warning text-pretty" role="status">
                      {t(
                        'التعديلات تدخل المراجعة ولن تظهر بالمتجر حتى يوافق مالك أو مدير.',
                        'Edits enter review and stay hidden until an owner or admin approves.',
                      )}
                    </p>
                  ) : null}
                  {isSeller && form.status === 'rejected' && editing?.review_note ? (
                    <p className="pe-field__hint text-error text-pretty" role="status">
                      {t('سبب الرفض', 'Rejection reason')}: {editing.review_note}
                    </p>
                  ) : null}
                    </div>
                  </div>
                  {stockNum <= 0
                    ? field(
                    'رسالة نفاد المخزون',
                    'Zero-stock label',
                    <select
                      value={form.oos_message}
                      onChange={(e) =>
                        setField('oos_message', e.target.value as 'out_of_stock' | 'not_available')
                      }
                      className="select select-bordered select-sm w-full"
                    >
                      <option value="out_of_stock">{t('نفد المخزون', 'Out of stock')}</option>
                      <option value="not_available">
                        {t('غير متوفر حالياً', 'Not available currently')}
                      </option>
                        </select>,
                      )
                    : null}
                </div>

                <div className="pe-pricing__zone">
                  <div className="pe-pricing__zone-head">
                    <h3 className="pe-pricing__zone-title">{t('ثقة الشراء', 'Purchase trust')}</h3>
                    <p className="pe-pricing__zone-hint text-pretty">
                      {t('تقييم افتراضي ووعد التسليم في السلة.', 'Default rating and cart delivery promise.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    <label className="pe-field">
                      <span className="pe-field__label">{t('التقييم الافتراضي', 'Default rating')}</span>
                      <div className="pe-pricing__rating">
                        <Star size={14} className="pe-pricing__rating-icon" aria-hidden />
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={form.rating_seed}
                          onChange={(e) => setField('rating_seed', e.target.value)}
                          className="input input-bordered input-sm w-full tabular-nums"
                        />
                      </div>
                      <span className="pe-field__hint text-pretty">
                        {t(
                          '٥ نجوم حتى يقيّم المشترون — ثم متوسط تقييماتهم',
                          '5★ until buyers review — then buyer average',
                        )}
                      </span>
                    </label>
                    <div className="pe-field">
                      <span className="pe-field__label">{t('وقت التسليم (السلة)', 'Delivery (cart)')}</span>
                      <div className="pe-pricing__delivery" role="group" aria-label={t('التسليم', 'Delivery')}>
                        {([
                          ['instant', 'فوري', 'Instant'],
                          ['minutes', 'دقائق', 'Minutes'],
                          ['hours', '٢٤س', '24h'],
                          ['days', '١–٣ي', '1–3d'],
                          ['custom', 'مخصص', 'Custom'],
                        ] as const).map(([id, ar, en]) => (
                          <button
                            key={id}
                            type="button"
                            className={`pe-pricing__delivery-btn${
                              form.delivery_preset === id ? ' is-active' : ''
                            }`}
                            aria-pressed={form.delivery_preset === id}
                            onClick={() => setField('delivery_preset', id)}
                          >
                            {t(ar, en)}
                          </button>
                        ))}
                      </div>
                      {form.delivery_preset === 'custom' ? (
                        <div className="pe-field-grid mt-2">
                        <input
                          type="text"
                          value={form.delivery_custom_en}
                          onChange={(e) => setField('delivery_custom_en', e.target.value)}
                          placeholder={t('الإنجليزية', 'English')}
                          className="input input-bordered input-sm w-full"
                          dir="ltr"
                        />
                        <input
                          type="text"
                          value={form.delivery_custom_ar}
                          onChange={(e) => setField('delivery_custom_ar', e.target.value)}
                          placeholder={t('العربية', 'Arabic')}
                          className="input input-bordered input-sm w-full"
                          dir="rtl"
                        />
                      </div>
                      ) : null}
                      <span className="pe-field__hint text-pretty">
                      {t(
                        'يظهر في ملخص السلة والدفع. الافتراضي: فوري.',
                        'Shown in cart and checkout summary. Default: Instant.',
                      )}
                    </span>
                  </div>
              </div>
                </div>
              </div>,
              {
                id: 'pe-pricing',
                icon: <CircleDollarSign size={14} strokeWidth={2.25} />,
                accent: 'commerce',
                hintAr: 'السعر والمخزون والحالة.',
                hintEn: 'Price, stock, and status.',
                i: 1,
              },
            )}
    </>
  );
}
