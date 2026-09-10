import { ChevronLeft, ChevronRight } from 'lucide-react';

/** DaisyUI join prev/next for dashboard tables. */
export default function PageBar({
  page,
  total,
  pageSize,
  onPage,
  t,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  t: (ar: string, en: string) => string;
}) {
  if (total <= pageSize) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(Math.max(0, page), pages - 1);
  return (
    <div className="join justify-center w-full mt-4" role="navigation" aria-label={t('صفحات', 'Pagination')}>
      <button
        type="button"
        className="btn btn-sm join-item btn-outline"
        disabled={safe <= 0}
        onClick={() => onPage(safe - 1)}
        aria-label={t('السابق', 'Previous')}
      >
        <ChevronLeft size={14} aria-hidden />
      </button>
      <span className="btn btn-sm join-item no-animation pointer-events-none tabular-nums font-normal">
        {safe + 1} / {pages}
      </span>
      <button
        type="button"
        className="btn btn-sm join-item btn-outline"
        disabled={safe >= pages - 1}
        onClick={() => onPage(safe + 1)}
        aria-label={t('التالي', 'Next')}
      >
        <ChevronRight size={14} aria-hidden />
      </button>
    </div>
  );
}
