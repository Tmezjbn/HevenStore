import { Sparkles, X } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import Modal from '../ui/Modal';
import ProductEffectsSection from './ProductEffectsSection';

type Props = {
  open: boolean;
  onClose: () => void;
};

/** Product aura + Hover 3D — catalog-local modal (was inline on Products). */
export default function ProductEffectsDialog({ open, onClose }: Props) {
  const { t } = useI18n();
  const title = t('تأثيرات المنتجات', 'Product effects');

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="product-effects-dialog-title"
      boxClassName="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      closeLabel={t('إغلاق', 'Close')}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="size-9 rounded-lg border border-primary/40 bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={16} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 id="product-effects-dialog-title" className="font-bold text-lg tracking-tight text-balance">
              {title}
            </h3>
            <p className="text-sm text-base-content/65 mt-1 text-pretty leading-relaxed">
              {t(
                'هالة وتحويم ثلاثي الأبعاد لكل منتج — بحث، تطبيق للكل، وحفظ هنا.',
                'Aura and Hover 3D per product — search, apply to all, and save here.',
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm btn-square shrink-0"
          onClick={onClose}
          aria-label={t('إغلاق', 'Close')}
        >
          <X size={16} />
        </button>
      </div>

      <ProductEffectsSection active={open} embedded />
    </Modal>
  );
}
