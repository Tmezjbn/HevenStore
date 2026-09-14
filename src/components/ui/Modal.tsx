import {
  useRef,
  type ReactNode,
} from 'react';
import { useI18n } from '../../lib/i18n';
import { useFocusTrap } from '../../hooks/useFocusTrap';

type Props = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Extra classes on the daisyUI modal-box */
  boxClassName?: string;
  closeLabel?: string;
} & (
  | { /** id of the visible title element inside the box */ labelledBy: string; label?: never }
  | { /** Used when labelledBy is omitted */ label: string; labelledBy?: never }
);

/**
 * DaisyUI modal with the a11y bits the raw markup lacks:
 * role/aria, initial focus, Tab trap, Escape, restore focus, lock scroll.
 */
export default function Modal({
  open,
  onClose,
  children,
  labelledBy,
  label,
  boxClassName = '',
  closeLabel,
}: Props) {
  const { t } = useI18n();
  const resolvedClose = closeLabel ?? t('إغلاق', 'Close');
  const boxRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useFocusTrap(open, boxRef, () => onCloseRef.current());

  if (!open) return null;

  return (
    <div
      className="modal modal-open"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
    >
      <div
        ref={boxRef}
        className={`modal-box outline-none ${boxClassName}`.trim()}
        tabIndex={-1}
      >
        {children}
      </div>
      <button
        type="button"
        className="modal-backdrop"
        onClick={() => onCloseRef.current()}
        aria-label={resolvedClose}
      />
    </div>
  );
}
