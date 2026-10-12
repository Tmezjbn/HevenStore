import type { UseMutationResult } from '@tanstack/react-query';
import type { SiteSettingsMap } from '../../../lib/siteSettings';
import { flattenCategoryTree, indentPrefix } from '../../../lib/categories';
import { slugifyProductType, type ProductTypeDef } from '../../../lib/productTypes';
import { Loader2, Plus, Package } from 'lucide-react';
import { type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { ProductForm } from './formModel';
import { Category } from '../../../types';

type BasicsSectionProps = {
  primarySection: (titleAr: string, titleEn: string, children: ReactNode, opts?: { id?: string; icon?: ReactNode; hintAr?: string; hintEn?: string; accent?: "default" | "commerce" | "fulfill" | "basics" | "copy"; i?: number; collapsible?: boolean; summary?: string; defaultOpen?: boolean; }) => JSX.Element;
  summaryName: string;
  form: ProductForm;
  t: (ar: string, en: string) => string;
  field: (labelAr: string, labelEn: string, node: ReactNode, hint?: [string, string]) => JSX.Element;
  setField: (key: keyof ProductForm, value: string) => void;
  categories: Category[];
  productTypeOptions: ProductTypeDef[];
  canManageTypes: boolean;
  addingType: boolean;
  newTypeEn: string;
  setNewTypeEn: Dispatch<SetStateAction<string>>;
  newTypeAr: string;
  setNewTypeAr: Dispatch<SetStateAction<string>>;
  saveSettings: UseMutationResult<void, Error, { updates: Partial<SiteSettingsMap>; userId: string; }, unknown>;
  addCustomProductType: () => Promise<void>;
  setAddingType: Dispatch<SetStateAction<boolean>>;
};

export default function BasicsSection({
  primarySection,
  summaryName,
  form,
  t,
  field,
  setField,
  categories,
  productTypeOptions,
  canManageTypes,
  addingType,
  newTypeEn,
  setNewTypeEn,
  newTypeAr,
  setNewTypeAr,
  saveSettings,
  addCustomProductType,
  setAddingType,
}: BasicsSectionProps) {
  return (
    <>
            {primarySection(
              'الأساسيات',
              'Basics',
              <div className="pe-basics">
                <div className="pe-basics__identity" aria-live="polite">
                  <p className="pe-basics__identity-name">{summaryName}</p>
                  <p className="pe-basics__identity-path font-mono" dir="ltr">
                    <span className="pe-basics__identity-prefix">/product/</span>
                    {form.slug.trim() || '—'}
                  </p>
                </div>

                <div className="pe-basics__zone">
                  <div className="pe-basics__zone-head">
                    <h3 className="pe-basics__zone-title">{t('الأسماء', 'Names')}</h3>
                    <p className="pe-basics__zone-hint text-pretty">
                      {t('إنجليزي وعربي بنفس الوزن — RTL جاهز.', 'English and Arabic at equal weight — RTL ready.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    {field(
                      'الاسم (إنجليزي)',
                      'Name (English)',
                      <input
                        value={form.name}
                        onChange={(e) => setField('name', e.target.value)}
                        className="input input-bordered input-sm w-full"
                        autoComplete="off"
                      />,
                    )}
                    {field(
                      'الاسم (عربي)',
                      'Name (Arabic)',
                      <input
                        value={form.name_ar}
                        onChange={(e) => setField('name_ar', e.target.value)}
                        dir="rtl"
                        className="input input-bordered input-sm w-full"
                        autoComplete="off"
                      />,
                    )}
                  </div>
                </div>

                <div className="pe-basics__zone">
                  <div className="pe-basics__zone-head">
                    <h3 className="pe-basics__zone-title">{t('الرابط', 'URL')}</h3>
                    <p className="pe-basics__zone-hint text-pretty">
                      {t('المعرّف يظهر في عنوان الصفحة.', 'Slug appears in the page address.')}
                    </p>
                  </div>
                  <label className="pe-field pe-basics__slug">
                    <span className="pe-field__label">{t('المعرّف (رابط)', 'Slug (URL)')}</span>
                    <div className="pe-basics__slug-row">
                      <span className="pe-basics__slug-prefix font-mono" dir="ltr" aria-hidden>
                        /product/
                      </span>
                      <input
                        value={form.slug}
                        onChange={(e) => setField('slug', e.target.value)}
                        dir="ltr"
                          className="input input-bordered w-full font-mono text-sm"
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </div>
                  </label>
                </div>

                <div className="pe-basics__zone">
                  <div className="pe-basics__zone-head">
                    <h3 className="pe-basics__zone-title">{t('التصنيف', 'Classify')}</h3>
                    <p className="pe-basics__zone-hint text-pretty">
                      {t('فئة المتجر ونوع البطاقة.', 'Store category and card type.')}
                    </p>
                  </div>
                  <div className="pe-field-grid">
                    {field(
                      'التصنيف',
                      'Category',
                      <select
                        value={form.category_id}
                        onChange={(e) => setField('category_id', e.target.value)}
                        className="select select-bordered select-sm w-full"
                      >
                    <option value="">{t('بدون تصنيف', 'No category')}</option>
                    {flattenCategoryTree(categories).map((c) => (
                      <option key={c.id} value={c.id}>
                        {indentPrefix(c.level)}
                        {c.name}
                      </option>
                    ))}
                      </select>,
                )}
                {field(
                  'نوع المنتج',
                  'Product Type',
                    <select
                      value={form.product_type || 'other'}
                      onChange={(e) => setField('product_type', e.target.value)}
                      className="select select-bordered select-sm w-full"
                    >
                      {productTypeOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {t(opt.labelAr, opt.labelEn)}
                        </option>
                      ))}
                      </select>,
                    )}
                  </div>
                  <div
                    className="pe-basics__type-chips"
                    role="group"
                    aria-label={t('اختيار سريع للنوع', 'Quick type pick')}
                  >
                    {productTypeOptions.slice(0, 8).map((opt) => {
                      const active = (form.product_type || 'other') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          className={`pe-basics__chip${active ? ' is-active' : ''}`}
                          aria-pressed={active}
                          onClick={() => setField('product_type', opt.id)}
                        >
                          {t(opt.labelAr, opt.labelEn)}
                        </button>
                      );
                    })}
                  </div>
                    {canManageTypes ? (
                      addingType ? (
                      <div className="pe-basics__new-type">
                        <div className="pe-field-grid">
                            <input
                              value={newTypeEn}
                              onChange={(e) => setNewTypeEn(e.target.value)}
                              placeholder={t('الاسم (إنجليزي)', 'Name (English)')}
                              className="input input-bordered input-sm w-full"
                              dir="ltr"
                            />
                            <input
                              value={newTypeAr}
                              onChange={(e) => setNewTypeAr(e.target.value)}
                              placeholder={t('الاسم (عربي)', 'Name (Arabic)')}
                              className="input input-bordered input-sm w-full"
                              dir="rtl"
                            />
                          </div>
                          {newTypeEn.trim() ? (
                          <p className="pe-field__hint font-mono" dir="ltr">
                              id: {slugifyProductType(newTypeEn)}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="btn btn-primary btn-xs"
                              disabled={saveSettings.isPending || !newTypeEn.trim()}
                              onClick={() => void addCustomProductType()}
                            >
                              {saveSettings.isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : null}
                              {t('حفظ النوع', 'Save type')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => {
                                setAddingType(false);
                                setNewTypeEn('');
                                setNewTypeAr('');
                              }}
                            >
                              {t('إلغاء', 'Cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                        className="btn btn-ghost btn-xs gap-1 self-start"
                          onClick={() => setAddingType(true)}
                        >
                          <Plus size={12} />
                          {t('إضافة نوع', 'Add type')}
                        </button>
                      )
                    ) : null}
                </div>
                  </div>,
              {
                id: 'pe-basics',
                icon: <Package size={14} strokeWidth={2.25} />,
                accent: 'basics',
                hintAr: 'الاسم والهوية في المتجر.',
                hintEn: 'Name and identity on the storefront.',
                i: 0,
              },
            )}
    </>
  );
}
