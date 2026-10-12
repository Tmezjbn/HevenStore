import { SecretField } from './formModel';
import { keyHasCustom } from './stockHelpers';
import { type CSSProperties } from 'react';
import { Trash2, Plus } from 'lucide-react';

type StockCardArgs = {
  t: (ar: string, en: string) => string;
};

export function createRenderStockCard({
  t,
}: StockCardArgs) {
  const renderStockCard = (
    opts: {
      keyId: string;
      index: number;
      content: string;
      secretDetails: string;
      secretFields: SecretField[];
      pending?: boolean;
      onDetails: (v: string) => void;
      onField: (fieldId: string, patch: Partial<Pick<SecretField, 'key' | 'value'>>) => void;
      onAddField: () => void;
      onRemoveField: (fieldId: string) => void;
      onRemove: () => void;
    },
  ) => {
    const custom = keyHasCustom(opts);
    return (
      <li key={opts.keyId} className="pe-stock-card" style={{ ['--i' as string]: opts.index } as CSSProperties}>
        <details className="pe-stock-card__details">
          <summary className="pe-stock-card__summary">
            <span className="pe-stock-card__index tabular-nums" aria-hidden>
              {opts.index + 1}
            </span>
            <span className="pe-stock-card__code font-mono" dir="ltr">
              {opts.content}
            </span>
            <span className="pe-stock-card__tags">
              {opts.pending ? (
                <span className="pe-stock-tag pe-stock-tag--pending">{t('جديد', 'New')}</span>
              ) : null}
              {custom ? (
                <span className="pe-stock-tag pe-stock-tag--custom">{t('مخصص', 'Custom')}</span>
              ) : (
                <span className="pe-stock-tag">{t('افتراضي', 'Default')}</span>
              )}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-error/80 pe-stock-card__remove"
              aria-label={t('حذف الوحدة', 'Remove unit')}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                opts.onRemove();
              }}
            >
              <Trash2 size={12} />
            </button>
          </summary>
          <div className="pe-stock-card__body">
            <label className="pe-field">
              <span className="pe-field__label">
                {t('تفاصيل هذه الوحدة', 'This unit’s delivery')}
              </span>
              <textarea
                value={opts.secretDetails}
                onChange={(e) => opts.onDetails(e.target.value)}
                rows={3}
                dir="auto"
                placeholder={t(
                  'فارغ = يستخدم الافتراضي المشترك',
                  'Empty = use shared default',
                )}
                className="textarea textarea-bordered textarea-sm w-full font-mono text-xs leading-relaxed"
              />
            </label>
            {opts.secretFields.length > 0 ? (
              <ul className="space-y-1.5">
                {opts.secretFields.map((f) => (
                  <li key={f.id} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
                    <input
                      value={f.key}
                      onChange={(e) => opts.onField(f.id, { key: e.target.value })}
                      placeholder={t('الاسم', 'Label')}
                      className="input input-bordered input-xs w-full sm:w-28 shrink-0"
                    />
                    <input
                      value={f.value}
                      onChange={(e) => opts.onField(f.id, { value: e.target.value })}
                      placeholder={t('القيمة', 'Value')}
                      dir="ltr"
                      className="input input-bordered input-xs w-full font-mono min-w-0"
                    />
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs btn-square text-error/80"
                      onClick={() => opts.onRemoveField(f.id)}
                      aria-label={t('حذف', 'Remove')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <button type="button" className="btn btn-ghost btn-xs gap-1 self-start" onClick={opts.onAddField}>
              <Plus size={12} />
              {t('قيمة لهذه الوحدة', 'Value for this unit')}
            </button>
          </div>
        </details>
      </li>
    );
  };

  return renderStockCard;
}
