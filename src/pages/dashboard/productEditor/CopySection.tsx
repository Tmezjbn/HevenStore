import { AlignLeft } from 'lucide-react';
import { type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { ProductForm } from './formModel';

type CopySectionProps = {
  primarySection: (titleAr: string, titleEn: string, children: ReactNode, opts?: { id?: string; icon?: ReactNode; hintAr?: string; hintEn?: string; accent?: "default" | "commerce" | "fulfill" | "basics" | "copy"; i?: number; collapsible?: boolean; summary?: string; defaultOpen?: boolean; }) => JSX.Element;
  t: (ar: string, en: string) => string;
  lang: 'ar' | 'en';
  form: ProductForm;
  copyLang: "ar" | "en" | "both";
  setCopyLang: Dispatch<SetStateAction<"ar" | "en" | "both">>;
  setField: (key: keyof ProductForm, value: string) => void;
};

export default function CopySection({
  primarySection,
  t,
  lang,
  form,
  copyLang,
  setCopyLang,
  setField,
}: CopySectionProps) {
  return (
    <>
            {primarySection(
              'وصف المتجر',
              'Storefront description',
              <div className="pe-copy">
                <div className="pe-copy__preview" aria-live="polite">
                  <p className="pe-copy__preview-label">{t('معاينة', 'Preview')}</p>
                  <p
                    className="pe-copy__preview-body text-pretty"
                    dir={
                      (lang === 'ar'
                        ? form.description_ar.trim() || form.description.trim()
                        : form.description.trim() || form.description_ar.trim())
                        ? lang === 'ar' && form.description_ar.trim()
                          ? 'rtl'
                          : lang === 'en' && form.description.trim()
                            ? 'ltr'
                            : form.description_ar.trim() && !form.description.trim()
                              ? 'rtl'
                              : 'auto'
                        : 'auto'
                    }
                  >
                    {(lang === 'ar'
                      ? form.description_ar.trim() || form.description.trim()
                      : form.description.trim() || form.description_ar.trim()) ||
                      t('ابدأ الكتابة — المعاينة تظهر هنا.', 'Start writing — preview shows here.')}
                  </p>
                </div>

                <div className="pe-copy__tabs" role="tablist" aria-label={t('اللغة', 'Language')}>
                  {(
                    [
                      ['both', 'الاثنان', 'Both'],
                      ['en', 'إنجليزي', 'English'],
                      ['ar', 'عربي', 'Arabic'],
                    ] as const
                  ).map(([id, ar, en]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={copyLang === id}
                      className={`pe-copy__tab${copyLang === id ? ' is-active' : ''}`}
                      onClick={() => setCopyLang(id)}
                    >
                      {t(ar, en)}
                    </button>
                  ))}
                </div>

                <div
                  className={`pe-copy__editors${copyLang === 'both' ? ' pe-copy__editors--both' : ''}`}
                >
                  {copyLang === 'en' || copyLang === 'both' ? (
                    <label className="pe-field pe-copy__editor">
                      <span className="pe-copy__editor-head">
                        <span className="pe-field__label">{t('الوصف (إنجليزي)', 'Description (English)')}</span>
                        <span className="pe-copy__count tabular-nums">
                          {form.description.trim().length}
                        </span>
                      </span>
                      <textarea
                        value={form.description}
                        onChange={(e) => setField('description', e.target.value)}
                        rows={copyLang === 'both' ? 6 : 10}
                        dir="ltr"
                        placeholder={t(
                          'ما يراه المشتري تحت العنوان — قصير وواضح.',
                          'What shoppers read under the title — short and clear.',
                        )}
                        className="textarea textarea-bordered textarea-sm w-full pe-copy__textarea"
                      />
                    </label>
                  ) : null}
                  {copyLang === 'ar' || copyLang === 'both' ? (
                    <label className="pe-field pe-copy__editor">
                      <span className="pe-copy__editor-head">
                        <span className="pe-field__label">{t('الوصف (عربي)', 'Description (Arabic)')}</span>
                        <span className="pe-copy__count tabular-nums">
                          {form.description_ar.trim().length}
                        </span>
                      </span>
                      <textarea
                        value={form.description_ar}
                        onChange={(e) => setField('description_ar', e.target.value)}
                        rows={copyLang === 'both' ? 6 : 10}
                        dir="rtl"
                        placeholder={t(
                          'نفس الوزن البصري للإنجليزي — RTL أصلي.',
                          'Same visual weight as English — native RTL.',
                        )}
                        className="textarea textarea-bordered textarea-sm w-full pe-copy__textarea"
                      />
                    </label>
                  ) : null}
              </div>
              </div>,
              {
                id: 'pe-copy',
                icon: <AlignLeft size={14} strokeWidth={2.25} />,
                accent: 'copy',
                hintAr: 'نص صفحة المنتج — إنجليزي وعربي.',
                hintEn: 'Product page copy — English and Arabic.',
                i: 3,
              },
            )}
    </>
  );
}
