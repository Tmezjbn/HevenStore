import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { ProductForm, SecretField } from './formModel';

type RequirementsSectionProps = {
  t: (ar: string, en: string) => string;
  form: ProductForm;
  addRequirementField: () => void;
  setRequirementField: (id: string, patch: Partial<Pick<SecretField, "key" | "value">>) => void;
  removeRequirementField: (id: string) => void;
};

export default function RequirementsSection({
  t,
  form,
  addRequirementField,
  setRequirementField,
  removeRequirementField,
}: RequirementsSectionProps) {
  return (
    <>
            <details id="pe-req" className="pe-req group">
              <summary className="pe-req__summary">
                <span className="pe-req__summary-main">
                  <span className="pe-req__icon" aria-hidden>
                    <ListChecks size={14} strokeWidth={2.25} />
                  </span>
                  <span className="pe-req__title">{t('المتطلبات', 'Requirements')}</span>
                </span>
                <span className="pe-req__summary-meta">
                  {form.requirementFields.length
                  ? t(`${form.requirementFields.length} حقل`, `${form.requirementFields.length} field(s)`)
                    : t('اختياري', 'Optional')}
                </span>
              </summary>
              <div className="pe-req__body">
                <p className="pe-req__hint text-pretty">
                  {t(
                    'تظهر للزوار في صفحة المنتج — مثال: نظام التشغيل → Windows, Linux, MacOS.',
                    'Shown on the product page — e.g. Operating System → Windows, Linux, MacOS.',
                  )}
                </p>

                <div
                  className="pe-req__stage"
                  data-mode={form.requirementFields.length ? 'filled' : 'empty'}
                  aria-hidden
                >
                {form.requirementFields.length === 0 ? (
                    <p className="pe-req__stage-empty">
                      {t('معاينة فارغة — أضف صفوفاً أدناه', 'Empty preview — add rows below')}
                  </p>
                ) : (
                    <dl className="pe-req__stage-list">
                    {form.requirementFields.map((f) => (
                        <div key={f.id} className="pe-req__stage-row">
                          <dt>{f.key.trim() || t('تسمية', 'Label')}</dt>
                          <dd>{f.value.trim() || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>

                {form.requirementFields.length === 0 ? (
                  <div className="pe-req__blank">
                    <p className="pe-req__blank-copy">
                      {t('لا متطلبات بعد — أضف عند الحاجة.', 'No requirements yet — add if needed.')}
                    </p>
                    <button type="button" className="pe-req__add" onClick={addRequirementField}>
                      <Plus size={14} strokeWidth={2.25} aria-hidden />
                      {t('إضافة متطلب', 'Add requirement')}
                    </button>
                  </div>
                ) : (
                  <>
                    <ul className="pe-req__list">
                      {form.requirementFields.map((f, i) => (
                        <li key={f.id} className="pe-req__item">
                          <span className="pe-req__index" aria-hidden>
                            {i + 1}
                          </span>
                          <div className="pe-req__fields">
                            <label className="pe-req__field pe-req__field--key">
                              <span className="pe-req__field-label">{t('التسمية', 'Label')}</span>
                        <input
                          value={f.key}
                          onChange={(e) => setRequirementField(f.id, { key: e.target.value })}
                                placeholder={t('نظام التشغيل', 'Operating System')}
                          aria-label={t('تسمية المتطلب', 'Requirement label')}
                        />
                            </label>
                            <span className="pe-req__arrow" aria-hidden>
                              →
                            </span>
                            <label className="pe-req__field pe-req__field--val">
                              <span className="pe-req__field-label">{t('القيمة', 'Value')}</span>
                        <input
                          value={f.value}
                          onChange={(e) => setRequirementField(f.id, { value: e.target.value })}
                                placeholder={t('Windows, Linux, MacOS', 'Windows, Linux, MacOS')}
                          aria-label={t('قيمة المتطلب', 'Requirement value')}
                        />
                            </label>
                          </div>
                        <button
                          type="button"
                            className="pe-req__remove"
                          onClick={() => removeRequirementField(f.id)}
                          aria-label={t('حذف المتطلب', 'Remove requirement')}
                          title={t('حذف المتطلب', 'Remove requirement')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                    <button type="button" className="pe-req__add" onClick={addRequirementField}>
                      <Plus size={14} strokeWidth={2.25} aria-hidden />
                  {t('إضافة متطلب', 'Add requirement')}
                </button>
                  </>
                )}
              </div>
            </details>
    </>
  );
}
