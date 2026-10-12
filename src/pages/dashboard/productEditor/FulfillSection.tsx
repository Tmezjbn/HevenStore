import { Plus, CircleHelp, ChevronDown, Trash2, ChevronUp, KeyRound } from 'lucide-react';
import { type ReactNode, type Dispatch, type SetStateAction } from 'react';
import { BulkDeliveryPasteTarget, KeyOverride, PendingStock, StockListItem } from './stockHelpers';
import { SecretField, ProductForm } from './formModel';
import { Product } from '../../../types';

type FulfillSectionProps = {
  primarySection: (titleAr: string, titleEn: string, children: ReactNode, opts?: { id?: string; icon?: ReactNode; hintAr?: string; hintEn?: string; accent?: "default" | "commerce" | "fulfill" | "basics" | "copy"; i?: number; collapsible?: boolean; summary?: string; defaultOpen?: boolean; }) => JSX.Element;
  t: (ar: string, en: string) => string;
  keyCounts: { available: number; claimed: number; };
  pendingKeyCount: number;
  customStockCount: number;
  fulfillTab: "default" | "stock";
  setFulfillTab: Dispatch<SetStateAction<"default" | "stock">>;
  stockDraft: string;
  setStockDraft: Dispatch<SetStateAction<string>>;
  queueDraftStock: () => void;
  stockPaste: string;
  setStockPaste: Dispatch<SetStateAction<string>>;
  pasteLineCount: number;
  queuePasteAsStock: () => void;
  totalStockUnits: number;
  deliveryPasteTarget: BulkDeliveryPasteTarget;
  setDeliveryPasteTarget: Dispatch<SetStateAction<BulkDeliveryPasteTarget>>;
  bulkLabelFields: SecretField[];
  renameBulkLabel: (index: number, key: string) => void;
  removeBulkLabel: (index: number) => void;
  addBulkLabel: () => void;
  deliveryPaste: string;
  setDeliveryPasteClamped: (nextPaste: string, two?: boolean) => void;
  deliveryTwoLinesPerUnit: boolean;
  setDeliveryTwoLinesPerUnit: Dispatch<SetStateAction<boolean>>;
  deliveryPasteWarn: string;
  deliveryPasteUnitCount: number;
  deliveryPasteLineCount: number;
  applyBulkDelivery: () => void;
  stockListAll: boolean;
  setStockListAll: Dispatch<SetStateAction<boolean>>;
  setStockPage: Dispatch<SetStateAction<number>>;
  stockPerPage: number;
  bumpStockPerPage: (delta: number) => void;
  stockPaged: boolean;
  stockPageCount: number;
  safeStockPage: number;
  keyOverrides: KeyOverride[];
  pendingStock: PendingStock[];
  visibleStockItems: StockListItem[];
  renderStockCard: (opts: { keyId: string; index: number; content: string; secretDetails: string; secretFields: SecretField[]; pending?: boolean; onDetails: (v: string) => void; onField: (fieldId: string, patch: Partial<Pick<SecretField, "key" | "value">>) => void; onAddField: () => void; onRemoveField: (fieldId: string) => void; onRemove: () => void; }) => JSX.Element;
  setPendingDetails: (tempId: string, secretDetails: string) => void;
  setPendingField: (tempId: string, fieldId: string, patch: Partial<Pick<SecretField, "key" | "value">>) => void;
  addPendingField: (tempId: string) => void;
  removePendingField: (tempId: string, fieldId: string) => void;
  removePendingStock: (tempId: string) => void;
  setKeyOverrideDetails: (id: string, secretDetails: string) => void;
  setKeyOverrideField: (keyId: string, fieldId: string, patch: Partial<Pick<SecretField, "key" | "value">>) => void;
  addKeyOverrideField: (keyId: string) => void;
  removeKeyOverrideField: (keyId: string, fieldId: string) => void;
  removeStockUnit: (id: string) => Promise<void>;
  editing: Product | null;
  clearUnclaimedKeys: () => void;
  form: ProductForm;
  setForm: Dispatch<SetStateAction<ProductForm>>;
  setSecretField: (id: string, patch: Partial<Pick<SecretField, "key" | "value">>) => void;
  removeSecretField: (id: string) => void;
  addSecretField: () => void;
  keyedProduct: boolean;
};

export default function FulfillSection({
  primarySection,
  t,
  keyCounts,
  pendingKeyCount,
  customStockCount,
  fulfillTab,
  setFulfillTab,
  stockDraft,
  setStockDraft,
  queueDraftStock,
  stockPaste,
  setStockPaste,
  pasteLineCount,
  queuePasteAsStock,
  totalStockUnits,
  deliveryPasteTarget,
  setDeliveryPasteTarget,
  bulkLabelFields,
  renameBulkLabel,
  removeBulkLabel,
  addBulkLabel,
  deliveryPaste,
  setDeliveryPasteClamped,
  deliveryTwoLinesPerUnit,
  setDeliveryTwoLinesPerUnit,
  deliveryPasteWarn,
  deliveryPasteUnitCount,
  deliveryPasteLineCount,
  applyBulkDelivery,
  stockListAll,
  setStockListAll,
  setStockPage,
  stockPerPage,
  bumpStockPerPage,
  stockPaged,
  stockPageCount,
  safeStockPage,
  keyOverrides,
  pendingStock,
  visibleStockItems,
  renderStockCard,
  setPendingDetails,
  setPendingField,
  addPendingField,
  removePendingField,
  removePendingStock,
  setKeyOverrideDetails,
  setKeyOverrideField,
  addKeyOverrideField,
  removeKeyOverrideField,
  removeStockUnit,
  editing,
  clearUnclaimedKeys,
  form,
  setForm,
  setSecretField,
  removeSecretField,
  addSecretField,
  keyedProduct,
}: FulfillSectionProps) {
  return (
    <>
            {primarySection(
              'التسليم',
              'Fulfillment',
              <div className="pe-fulfill">
                <div className="pe-fulfill__meter" aria-label={t('ملخص المخزون', 'Stock summary')}>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{keyCounts.available + pendingKeyCount}</span>
                    <span className="pe-fulfill__stat-l">{t('متاح', 'Available')}</span>
                  </div>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{keyCounts.claimed}</span>
                    <span className="pe-fulfill__stat-l">{t('مُسلَّم', 'Delivered')}</span>
                  </div>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{pendingKeyCount}</span>
                    <span className="pe-fulfill__stat-l">{t('في الانتظار', 'Queued')}</span>
                  </div>
                  <div className="pe-fulfill__stat">
                    <span className="pe-fulfill__stat-n tabular-nums">{customStockCount}</span>
                    <span className="pe-fulfill__stat-l">{t('مخصص', 'Custom')}</span>
                  </div>
                </div>

                <div className="pe-fulfill__tabs" role="tablist" aria-label={t('التسليم', 'Fulfillment')}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={fulfillTab === 'stock'}
                    className={`pe-fulfill__tab${fulfillTab === 'stock' ? ' is-active' : ''}`}
                    onClick={() => setFulfillTab('stock')}
                  >
                    {t('وحدات المخزون', 'Stock units')}
                    <span className="pe-fulfill__tab-n tabular-nums">{keyCounts.available + pendingKeyCount}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={fulfillTab === 'default'}
                    className={`pe-fulfill__tab${fulfillTab === 'default' ? ' is-active' : ''}`}
                    onClick={() => setFulfillTab('default')}
                  >
                    {t('الافتراضي المشترك', 'Shared default')}
                  </button>
                </div>

                {fulfillTab === 'stock' ? (
                  <div className="pe-fulfill__stock" role="tabpanel">
                    <div className="pe-fulfill__add">
                      <div className="pe-fulfill__add-row">
                        <input
                          value={stockDraft}
                          onChange={(e) => setStockDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              queueDraftStock();
                            }
                          }}
                          dir="ltr"
                          placeholder={t('أضف وحدة واحدة — الصق المفتاح ثم Enter', 'Add one unit — paste key, then Enter')}
                          className="input input-bordered w-full font-mono text-sm"
                          aria-label={t('مفتاح جديد', 'New key')}
                        />
                        <button type="button" className="btn btn-primary shrink-0" onClick={queueDraftStock} disabled={!stockDraft.trim()}>
                          <Plus size={15} strokeWidth={2.25} aria-hidden />
                          {t('إضافة', 'Add')}
                        </button>
                      </div>
                      <details className="pe-fulfill__bulk">
                        <summary className="pe-fulfill__bulk-summary">
                          <span className="pe-fulfill__bulk-label">{t('لصق دفعة', 'Bulk paste')}</span>
                          <span
                            className="tooltip tooltip-bottom shrink-0"
                            data-tip={t(
                              'الصق مفاتيح متعددة — سطر واحد = وحدة جديدة في الطابور.',
                              'Paste many keys — one line = one new queued unit.',
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="pe-fulfill__bulk-tip"
                              aria-label={t('مساعدة لصق المفاتيح', 'Bulk key paste help')}
                              aria-describedby="pe-fulfill-bulk-keys-tip"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <CircleHelp size={14} aria-hidden />
                            </button>
                          </span>
                          <ChevronDown size={14} className="pe-fulfill__bulk-chev" aria-hidden />
                        </summary>
                        <div className="pe-fulfill__bulk-body">
                          <p id="pe-fulfill-bulk-keys-tip" className="pe-field__hint text-pretty">
                            {t(
                              'الصق مفاتيح الترخيص دفعة واحدة — كل سطر غير فارغ يصبح وحدة مخزون جديدة في الطابور (تُحفظ عند حفظ المنتج). لا يغيّر الوحدات الموجودة.',
                              'Paste license keys in bulk — each non-empty line becomes a new stock unit in the queue (saved when you save the product). Does not change units already in the list.',
                            )}
                          </p>
                  <textarea
                            value={stockPaste}
                            onChange={(e) => setStockPaste(e.target.value)}
                            rows={3}
                    dir="ltr"
                            placeholder={t('مفتاح في كل سطر', 'One key per line')}
                    className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
                            aria-label={t('لصق مفاتيح', 'Paste keys')}
                  />
                  <div className="flex items-center justify-between gap-2">
                            <span className="pe-field__hint tabular-nums">
                              {pasteLineCount > 0
                                ? t(`${pasteLineCount} سطر`, `${pasteLineCount} line(s)`)
                                : t('ثم أضف للطابور قبل الحفظ', 'Queue before save')}
                      </span>
                            <button type="button" className="btn btn-outline btn-xs" disabled={pasteLineCount === 0} onClick={queuePasteAsStock}>
                              {t('إضافة للطابور', 'Queue units')}
                      </button>
                          </div>
                        </div>
                      </details>
                      <details
                        className={`pe-fulfill__bulk pe-fulfill__bulk--delivery${totalStockUnits === 0 ? ' is-locked' : ''}`}
                        onToggle={(e) => {
                          if (totalStockUnits === 0) {
                            e.currentTarget.open = false;
                          }
                        }}
                      >
                        <summary
                          className="pe-fulfill__bulk-summary"
                          aria-disabled={totalStockUnits === 0 || undefined}
                          onClick={(e) => {
                            if (totalStockUnits === 0) e.preventDefault();
                          }}
                        >
                          <span className="pe-fulfill__bulk-label">{t('لصق تسليم دفعة', 'Bulk delivery paste')}</span>
                          <span
                            className="tooltip tooltip-bottom shrink-0"
                            data-tip={t(
                              'الصق تفاصيل التسليم للوحدات الموجودة بالترتيب.',
                              'Paste delivery details for existing units in list order.',
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="pe-fulfill__bulk-tip"
                              aria-label={t('مساعدة لصق التسليم', 'Bulk delivery paste help')}
                              aria-describedby="pe-fulfill-bulk-delivery-tip"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <CircleHelp size={14} aria-hidden />
                            </button>
                          </span>
                          <ChevronDown size={14} className="pe-fulfill__bulk-chev" aria-hidden />
                        </summary>
                        <div className="pe-fulfill__bulk-body">
                          <p id="pe-fulfill-bulk-delivery-tip" className="pe-field__hint text-pretty">
                            {deliveryPasteTarget === 'labels'
                              ? t(
                                  'يملأ قيم الحقول المُسمّاة للوحدات الموجودة دون إنشاء مفاتيح جديدة. السطر 1 → قيمة الحقل الأول للوحدة 1، وهكذا بنفس ترتيب القائمة. فعّل «سطران لكل وحدة» لملء الحقلين الأولين (مثل بريد ثم كلمة مرور). عدّل أسماء الحقول أدناه — تُطبَّق على كل الوحدات. الأسطر الزائدة يُتجاهَل معها تنبيه.',
                                  'Fills named label values for units already in the list without creating new keys. Line 1 → first label value for unit 1, in list order. Enable “2 lines per unit” to fill the first two label values (e.g. email then password). Edit label names below — applied to all units. Extra lines are ignored with a warning.',
                                )
                              : t(
                                  'يملأ محتوى التسليم للوحدات الموجودة دون إنشاء مفاتيح جديدة. السطر 1 → الوحدة 1، السطر 2 → الوحدة 2، وهكذا بنفس ترتيب القائمة. فعّل «سطران لكل وحدة» لربط سطرين (مثل بريد ثم كلمة مرور) في حقول القيم لنفس الوحدة. الأسطر الزائدة يُتجاهَل معها تنبيه.',
                                  'Fills delivery content for units already in the list without creating new keys. Line 1 → unit 1, line 2 → unit 2, in list order. Enable “2 lines per unit” to pair lines (e.g. email then password) into that unit’s value fields. Extra lines are ignored with a warning.',
                                )}
                          </p>
                          {totalStockUnits === 0 ? (
                            <p className="pe-field__hint text-pretty pe-fulfill__bulk-lock">
                              {t(
                                'أضف وحدة مخزون واحدة على الأقل قبل لصق التسليم.',
                                'Add at least one stock unit before bulk delivery paste.',
                              )}
                            </p>
                          ) : (
                            <>
                              <div
                                className="pe-fulfill__view-modes"
                                role="group"
                                aria-label={t('وجهة اللصق', 'Paste target')}
                              >
                                <button
                                  type="button"
                                  className={`pe-fulfill__view-mode${deliveryPasteTarget === 'delivery' ? ' is-active' : ''}`}
                                  aria-pressed={deliveryPasteTarget === 'delivery'}
                                  onClick={() => setDeliveryPasteTarget('delivery')}
                                >
                                  {t('تسليم الوحدة', 'Unit delivery')}
                                </button>
                                <button
                                  type="button"
                                  className={`pe-fulfill__view-mode${deliveryPasteTarget === 'labels' ? ' is-active' : ''}`}
                                  aria-pressed={deliveryPasteTarget === 'labels'}
                                  onClick={() => setDeliveryPasteTarget('labels')}
                                >
                                  {t('الحقول المُسمّاة', 'Labels')}
                                </button>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <span className="pe-field__label text-xs">{t('أسماء الحقول', 'Label names')}</span>
                                {bulkLabelFields.length === 0 ? (
                                  <p className="pe-field__hint m-0">
                                    {t(
                                      'لا حقول بعد — أضف اسماً لتطبيقه على كل الوحدات.',
                                      'No labels yet — add a name to apply across all units.',
                                    )}
                                  </p>
                                ) : (
                                  <ul className="space-y-1.5">
                                    {bulkLabelFields.map((f, index) => (
                                      <li key={f.id} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                                        <input
                                          value={f.key}
                                          onChange={(e) => renameBulkLabel(index, e.target.value)}
                                          placeholder={t('الاسم', 'Label')}
                                          aria-label={t(`اسم الحقل ${index + 1}`, `Label ${index + 1} name`)}
                                          className="input input-bordered input-xs w-full sm:w-28 shrink-0"
                                        />
                                        <button
                                          type="button"
                                          className="btn btn-ghost btn-xs btn-square text-error/80"
                                          onClick={() => removeBulkLabel(index)}
                                          aria-label={t(`حذف الحقل ${index + 1}`, `Remove label ${index + 1}`)}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                <button type="button" className="btn btn-ghost btn-xs gap-1 self-start" onClick={addBulkLabel}>
                                  <Plus size={12} />
                                  {t('إضافة حقل', 'Add label')}
                                </button>
                              </div>
                              <textarea
                                value={deliveryPaste}
                                onChange={(e) => setDeliveryPasteClamped(e.target.value)}
                                rows={3}
                                dir="auto"
                                placeholder={
                                  deliveryPasteTarget === 'labels'
                                    ? deliveryTwoLinesPerUnit
                                      ? t('سطران لكل وحدة — قيمة الحقل الأول ثم الثاني', 'Two lines per unit — first label value then second')
                                      : t('سطر لكل وحدة — قيمة الحقل الأول', 'One line per unit — first label value')
                                    : deliveryTwoLinesPerUnit
                                      ? t('سطران لكل وحدة — بريد ثم كلمة مرور', 'Two lines per unit — email then password')
                                      : t('سطر لكل وحدة — محتوى التسليم', 'One line per unit — delivery content')
                                }
                                className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
                                aria-label={
                                  deliveryPasteTarget === 'labels'
                                    ? t('لصق قيم الحقول', 'Paste label values')
                                    : t('لصق تسليم', 'Paste delivery')
                                }
                              />
                              <label className="pe-fulfill__bulk-check">
                                <input
                                  type="checkbox"
                                  className="checkbox checkbox-xs"
                                  checked={deliveryTwoLinesPerUnit}
                                  onChange={(e) => {
                                    const two = e.target.checked;
                                    setDeliveryTwoLinesPerUnit(two);
                                    setDeliveryPasteClamped(deliveryPaste, two);
                                  }}
                                />
                                <span>{t('سطران لكل وحدة', '2 lines per unit')}</span>
                              </label>
                              {deliveryPasteWarn ? (
                                <p className="pe-field__hint text-warning text-pretty" role="status">
                                  {deliveryPasteWarn}
                                </p>
                              ) : null}
                              <div className="flex items-center justify-between gap-2">
                                <span className="pe-field__hint tabular-nums">
                                  {deliveryPasteUnitCount > 0
                                    ? deliveryTwoLinesPerUnit
                                      ? t(
                                          `${deliveryPasteUnitCount} وحدة (${deliveryPasteLineCount} سطر)`,
                                          `${deliveryPasteUnitCount} unit(s) (${deliveryPasteLineCount} line(s))`,
                                        )
                                      : t(`${deliveryPasteUnitCount} سطر`, `${deliveryPasteUnitCount} line(s)`)
                                    : t('يُطبَّق على الوحدات الحالية قبل الحفظ', 'Applied to current units before save')}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-outline btn-xs"
                                  disabled={deliveryPasteUnitCount === 0}
                                  onClick={applyBulkDelivery}
                                >
                                  {t('تطبيق على الوحدات', 'Apply to units')}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </details>
                    </div>

                    {totalStockUnits > 0 ? (
                      <div className="pe-fulfill__view">
                        <div
                          className="pe-fulfill__view-modes"
                          role="group"
                          aria-label={t('عرض الوحدات', 'Unit list view')}
                        >
                          <button
                            type="button"
                            className={`pe-fulfill__view-mode${stockListAll ? ' is-active' : ''}`}
                            aria-pressed={stockListAll}
                            onClick={() => setStockListAll(true)}
                          >
                            {t('عرض الكل', 'Show all units')}
                          </button>
                          <button
                            type="button"
                            className={`pe-fulfill__view-mode${!stockListAll ? ' is-active' : ''}`}
                            aria-pressed={!stockListAll}
                            onClick={() => {
                              setStockListAll(false);
                              setStockPage(0);
                            }}
                          >
                            {t('عرض لكل صفحة', 'Show per page')}
                          </button>
                        </div>
                        {!stockListAll ? (
                          <div className="pe-fulfill__view-per">
                            <span className="pe-field__hint">{t('لكل صفحة', 'Per page')}</span>
                            <span className="pe-fulfill__view-n tabular-nums" aria-live="polite">
                              {stockPerPage}
                            </span>
                            <div className="pe-fulfill__view-steps">
                              <button
                                type="button"
                                className="pe-fulfill__view-step"
                                disabled={stockPerPage <= 3}
                                onClick={() => bumpStockPerPage(-1)}
                                aria-label={t('تقليل عدد الصفحة', 'Decrease page size')}
                              >
                                <ChevronDown size={12} aria-hidden />
                              </button>
                              <button
                                type="button"
                                className="pe-fulfill__view-step"
                                onClick={() => bumpStockPerPage(1)}
                                aria-label={t('زيادة عدد الصفحة', 'Increase page size')}
                              >
                                <ChevronUp size={12} aria-hidden />
                              </button>
                            </div>
                          </div>
                        ) : null}
                        {stockPaged ? (
                          <nav className="pe-fulfill__pager" aria-label={t('صفحات الوحدات', 'Unit pages')}>
                            {Array.from({ length: stockPageCount }, (_, i) => (
                              <button
                                key={i}
                                type="button"
                                className={`pe-fulfill__page${i === safeStockPage ? ' is-active' : ''}`}
                                aria-label={t(`صفحة ${i + 1}`, `Page ${i + 1}`)}
                                aria-current={i === safeStockPage ? 'page' : undefined}
                                onClick={() => setStockPage(i)}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </nav>
                        ) : null}
                      </div>
                    ) : null}

                    {keyOverrides.length === 0 && pendingStock.length === 0 ? (
                      <div className="pe-fulfill__empty">
                        <KeyRound size={22} aria-hidden />
                        <p className="pe-fulfill__empty-title">{t('لا وحدات بعد', 'No stock units yet')}</p>
                        <p className="pe-field__hint text-pretty">
                          {t(
                            'كل وحدة = مفتاح يُسلَّم لمشترٍ واحد. أضف واحدة أو الصق دفعة — يمكن تخصيص تفاصيل كل وحدة.',
                            'Each unit = one key for one buyer. Add one or bulk paste — customize details per unit.',
                          )}
                        </p>
                  </div>
                    ) : (
                      <ul className="pe-stock-list">
                        {visibleStockItems.map((item) =>
                          item.kind === 'pending'
                            ? renderStockCard({
                                keyId: item.row.tempId,
                                index: item.globalIndex,
                                content: item.row.content,
                                secretDetails: item.row.secretDetails,
                                secretFields: item.row.secretFields,
                                pending: true,
                                onDetails: (v) => setPendingDetails(item.row.tempId, v),
                                onField: (fid, patch) => setPendingField(item.row.tempId, fid, patch),
                                onAddField: () => addPendingField(item.row.tempId),
                                onRemoveField: (fid) => removePendingField(item.row.tempId, fid),
                                onRemove: () => removePendingStock(item.row.tempId),
                              })
                            : renderStockCard({
                                keyId: item.row.id,
                                index: item.globalIndex,
                                content: item.row.content,
                                secretDetails: item.row.secretDetails,
                                secretFields: item.row.secretFields,
                                onDetails: (v) => setKeyOverrideDetails(item.row.id, v),
                                onField: (fid, patch) => setKeyOverrideField(item.row.id, fid, patch),
                                onAddField: () => addKeyOverrideField(item.row.id),
                                onRemoveField: (fid) => removeKeyOverrideField(item.row.id, fid),
                                onRemove: () => void removeStockUnit(item.row.id),
                              }),
                        )}
                      </ul>
                    )}

                    {editing && keyCounts.available > 0 ? (
                      <div className="pe-fulfill__danger">
                        <button type="button" className="btn btn-ghost btn-xs text-error gap-1" onClick={clearUnclaimedKeys}>
                          <Trash2 size={12} />
                          {t('حذف كل المتاح', 'Delete all available')}
                        </button>
                </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="pe-fulfill__default" role="tabpanel">
                    <p className="pe-field__hint text-pretty">
                      {t(
                        'يُستخدم لكل وحدة بلا تفاصيل مخصصة. أسماء الحقول تبقى خاصة عن المشتري.',
                        'Used by every unit without custom details. Field labels stay private from the buyer.',
                      )}
                    </p>
                    <label className="pe-field">
                      <span className="pe-field__label">{t('محتوى التسليم', 'Delivery content')}</span>
                  <textarea
                    value={form.secretDetails}
                    onChange={(e) => setForm((prev) => ({ ...prev, secretDetails: e.target.value }))}
                    rows={5}
                    dir="auto"
                    placeholder={t(
                          'تعليمات، نص، روابط… تُسلَّم بعد الدفع',
                          'Instructions, text, links… delivered after payment',
                    )}
                    className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
                  />
                </label>
                <div className="space-y-2">
                      <p className="pe-field__label">{t('قيم (اختياري)', 'Values (optional)')}</p>
                  {form.secretFields.length === 0 ? (
                        <p className="pe-field__hint">{t('لا قيم بعد — أضف عند الحاجة.', 'No values yet — add if needed.')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {form.secretFields.map((f) => (
                        <li key={f.id} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                          <input
                            value={f.key}
                            onChange={(e) => setSecretField(f.id, { key: e.target.value })}
                            placeholder={t('الاسم (للمالك فقط)', 'Label (admin only)')}
                            className="input input-bordered input-sm w-full sm:w-36 shrink-0"
                          />
                          <input
                            value={f.value}
                            onChange={(e) => setSecretField(f.id, { value: e.target.value })}
                            placeholder={t('القيمة', 'Value')}
                            dir="ltr"
                            className="input input-bordered input-sm w-full font-mono min-w-0"
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-square text-error/80 shrink-0"
                            onClick={() => removeSecretField(f.id)}
                            aria-label={t('حذف الحقل', 'Remove field')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm gap-1.5" onClick={addSecretField}>
                    <Plus size={14} />
                    {t('إضافة قيمة', 'Add value')}
                  </button>
                </div>
                  </div>
                )}

                <p className="pe-field__hint text-pretty">
                  {t(
                    'خاص. يظهر للمشتري فقط بعد دفع ناجح. المخزون = عدد الوحدات المتاحة.',
                    'Private. Shown to the buyer only after successful payment. Stock = available units.',
                  )}
                </p>
              </div>,
              {
                id: 'pe-fulfill',
                icon: <KeyRound size={14} strokeWidth={2.25} />,
                accent: 'fulfill',
                hintAr: 'مفتاح لكل وحدة — التفاصيل اختيارية.',
                hintEn: 'One key per unit — details optional.',
                i: 2,
                collapsible: true,
                summary: keyedProduct
                  ? t(
                      `${keyCounts.available + pendingKeyCount} متاح`,
                      `${keyCounts.available + pendingKeyCount} available`,
                    )
                  : t('بدون مخزون', 'No stock'),
              },
            )}
    </>
  );
}
