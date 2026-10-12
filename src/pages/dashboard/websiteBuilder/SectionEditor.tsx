import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { type PageSection } from '../../../lib/siteSettings';

export default function SectionEditor({
  title,
  sections,
  labels,
  onToggle,
  onMove,
  onRemove,
  canRemove,
  t,
}: {
  title: string;
  sections: PageSection[];
  labels: Record<string, string>;
  onToggle: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove?: (id: string) => void;
  canRemove?: (id: string) => boolean;
  t: (ar: string, en: string) => string;
}) {
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';
  const enabledCount = sections.filter((s) => s.enabled).length;
  return (
    <div className="rounded-lg border border-base-300 bg-base-100 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-base-300">
        <h4 className="text-base font-semibold tracking-tight text-balance">{title}</h4>
        <span className="badge badge-ghost badge-sm font-semibold tabular-nums">
          {enabledCount}/{sections.length}
        </span>
      </div>
      <ul className="divide-y divide-base-300">
        {sections.map((s, i) => (
          <li
            key={s.id}
            className={`flex items-center gap-2.5 px-3 py-2.5 transition-colors ${
              s.enabled ? 'bg-transparent' : 'bg-base-200/40'
            }`}
          >
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={s.enabled}
              onChange={() => onToggle(s.id)}
              aria-label={labels[s.id] ?? s.id}
            />
            <span
              className={`flex-1 text-sm font-semibold tracking-tight ${
                s.enabled ? '' : 'text-base-content/50 line-through'
              }`}
            >
              {labels[s.id] ?? s.id}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                disabled={i === 0}
                onClick={() => onMove(i, -1)}
                aria-label={t('أعلى', 'Up')}
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-xs btn-square ${focusRing}`}
                disabled={i === sections.length - 1}
                onClick={() => onMove(i, 1)}
                aria-label={t('أسفل', 'Down')}
              >
                <ChevronDown size={14} />
              </button>
              {onRemove && canRemove?.(s.id) ? (
                <button
                  type="button"
                  className={`btn btn-ghost btn-xs btn-square text-error ${focusRing}`}
                  onClick={() => onRemove(s.id)}
                  aria-label={t('حذف', 'Remove')}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
